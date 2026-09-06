import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../../../services/auth";
import {
  fetchReferrals,
  claimReferral,
  type Referral,
} from "../../../services/referrals";
import {
  fetchDoctorDashboard,
  type DoctorDashboardData,
} from "../../../services/dashboard";

function DoctorDashboardPage() {
  const storedUser = getStoredUser();

  const [dashboardStats, setDashboardStats] =
    useState<DoctorDashboardData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Claiming case state
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [claimErrorMsg, setClaimErrorMsg] = useState<string | null>(null);

  // Filters state (Default to "AVAILABLE")
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("AVAILABLE");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  const isNoDR = useCallback((prediction?: string) => {
    const p = (prediction || "").toUpperCase().trim();
    return p.includes("NO DR") || p.includes("NORMAL") || p === "0" || !p;
  }, []);

  const getPriorityRank = useCallback((prediction?: string, priority?: string): number => {
    const p = (priority || prediction || "").toUpperCase();
    if (p.includes("PROLIFERATIVE") || p === "URGENT") return 1;
    if (p.includes("SEVERE") || p === "HIGH") return 2;
    if (p.includes("MODERATE") || p === "MEDIUM") return 3;
    if (p.includes("MILD") || p === "LOW") return 4;
    return 5;
  }, []);

  const loadDoctorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsData, referralsData] = await Promise.all([
        fetchDoctorDashboard().catch(() => null),
        fetchReferrals({ status: "ALL" }),
      ]);

      if (statsData) {
        setDashboardStats(statsData);
      }
      setReferrals(referralsData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load referrals. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctorData();
  }, [loadDoctorData]);

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatPercent = (val?: number | string | null): string => {
    if (val === undefined || val === null) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "—";
    const pct = num <= 1 ? num * 100 : num;
    return `${pct.toFixed(1)}%`;
  };

  // Self-claim referral handler
  const handleClaim = async (referralId: number) => {
    if (claimingId) return;
    setClaimingId(referralId);
    setClaimSuccessMsg(null);
    setClaimErrorMsg(null);
    setError(null);

    try {
      await claimReferral(referralId);
      setClaimSuccessMsg(`Case #${referralId} claimed successfully and moved to your assigned queue!`);

      // Immediately update local state
      setReferrals((prev) =>
        prev.map((r) =>
          r.id === referralId
            ? {
                ...r,
                status: "ASSIGNED",
                assigned_doctor: Number(storedUser?.id),
                assigned_doctor_name: storedUser?.full_name || storedUser?.username || "You",
                available_for_claim: false,
              }
            : r
        )
      );

      // Refresh dashboard metrics in background
      fetchDoctorDashboard().then(setDashboardStats).catch(() => null);
    } catch (err) {
      if (err instanceof Error) {
        setClaimErrorMsg(err.message || "Failed to claim this referral.");
      } else {
        setClaimErrorMsg("Failed to claim this referral. Please try again.");
      }
      // Re-fetch to sync if another doctor claimed it
      loadDoctorData();
    } finally {
      setClaimingId(null);
    }
  };

  // Calculate summary metrics (strictly actionable doctor cases, excluding No DR)
  const summaryCounts = useMemo(() => {
    const actionableReferrals = referrals.filter((r) => !isNoDR(r.prediction));

    const availableCount = actionableReferrals.filter(
      (r) => r.available_for_claim || (!r.assigned_doctor && r.status === "PENDING")
    ).length;

    const myAssignedCount = actionableReferrals.filter(
      (r) =>
        Boolean(r.assigned_doctor && storedUser && Number(r.assigned_doctor) === Number(storedUser.id)) &&
        r.status === "ASSIGNED"
    ).length;

    const totalReviewed = actionableReferrals.filter(
      (r) => r.status === "REVIEWED" || r.status === "COLLECTED"
    ).length;

    const urgentCases = actionableReferrals.filter((r) => {
      const p = (r.priority || r.prediction || "").toUpperCase();
      const isPendingOrAssigned = r.status === "ASSIGNED" || r.status === "PENDING";
      return (
        (p.includes("SEVERE") || p.includes("PROLIFERATIVE") || p === "URGENT" || p === "HIGH") &&
        isPendingOrAssigned
      );
    }).length;

    return {
      available: dashboardStats?.referrals.available ?? availableCount,
      myAssigned: dashboardStats?.referrals.assigned ?? myAssignedCount,
      totalReviewed:
        dashboardStats?.referrals.reviewed !== undefined
          ? dashboardStats.referrals.reviewed + (dashboardStats.referrals.collected || 0)
          : totalReviewed,
      urgentCases: dashboardStats?.referrals.urgent ?? urgentCases,
      total: actionableReferrals.length,
    };
  }, [referrals, dashboardStats, isNoDR, storedUser]);

  // Filtered and priority-sorted referrals
  const filteredReferrals = useMemo(() => {
    return referrals
      .filter((ref) => {
        // Exclude No DR cases from doctor view at all times
        if (isNoDR(ref.prediction)) return false;

        // Search filter
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (ref.patient_name || "").toLowerCase().includes(q) ||
          String(ref.patient_id || "").includes(q) ||
          String(ref.id).includes(q) ||
          (ref.prediction || "").toLowerCase().includes(q) ||
          (ref.priority || "").toLowerCase().includes(q);

        // Status filter
        let matchesStatus = true;
        const isAvailable = ref.available_for_claim || (!ref.assigned_doctor && ref.status === "PENDING");
        const isAssignedToMe = Boolean(
          ref.assigned_doctor && storedUser && Number(ref.assigned_doctor) === Number(storedUser.id)
        );

        if (statusFilter === "AVAILABLE") {
          matchesStatus = isAvailable;
        } else if (statusFilter === "ASSIGNED" || statusFilter === "MY_ASSIGNED") {
          matchesStatus = isAssignedToMe && (ref.status === "ASSIGNED" || ref.status === "PENDING");
        } else if (statusFilter === "REVIEWED") {
          matchesStatus = ref.status === "REVIEWED" || ref.status === "COLLECTED";
        } else if (statusFilter === "ALL") {
          matchesStatus = true;
        }

        // Severity filter
        let matchesSeverity = true;
        const p = (ref.prediction || "").toUpperCase();
        const prio = (ref.priority || "").toUpperCase();
        if (severityFilter === "URGENT") {
          matchesSeverity = p.includes("PROLIFERATIVE") || prio === "URGENT";
        } else if (severityFilter === "HIGH") {
          matchesSeverity = p.includes("SEVERE") || prio === "HIGH";
        } else if (severityFilter === "MEDIUM") {
          matchesSeverity = p.includes("MODERATE") || prio === "MEDIUM";
        } else if (severityFilter === "LOW") {
          matchesSeverity = p.includes("MILD") || prio === "LOW";
        }

        return matchesSearch && matchesStatus && matchesSeverity;
      })
      .sort((a, b) => {
        // 1. Proliferative / URGENT (1)
        // 2. Severe / HIGH (2)
        // 3. Moderate / MEDIUM (3)
        // 4. Mild / LOW (4)
        const rankA = getPriorityRank(a.prediction, a.priority);
        const rankB = getPriorityRank(b.prediction, b.priority);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        // 5. Oldest referral first
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      });
  }, [referrals, searchQuery, statusFilter, severityFilter, isNoDR, getPriorityRank, storedUser]);

  // Prediction badge
  const getPredictionBadge = (prediction?: string) => {
    const p = (prediction || "").toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          No DR
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Mild DR
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Moderate DR
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Severe DR
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          Proliferative DR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
        {prediction || "—"}
      </span>
    );
  };

  // Visible Clinical Priority badge
  const getPriorityBadge = (prediction?: string, priority?: string) => {
    const p = (priority || prediction || "").toUpperCase();
    if (p.includes("PROLIFERATIVE") || p === "URGENT") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100/90 px-2.5 py-1 text-xs font-black text-red-800 border border-red-300 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          URGENT
        </span>
      );
    }
    if (p.includes("SEVERE") || p === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100/90 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-600" />
          HIGH
        </span>
      );
    }
    if (p.includes("MODERATE") || p === "MEDIUM") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          MEDIUM
        </span>
      );
    }
    if (p.includes("MILD") || p === "LOW") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-300">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          LOW
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
        —
      </span>
    );
  };

  // Status badge styling
  const getStatusBadge = (status?: string, isAvailable?: boolean) => {
    if (isAvailable) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Available to Claim
        </span>
      );
    }

    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Assigned to You
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Pending
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Reviewed
          </span>
        );
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            Collected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            {s}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          A. PAGE HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A194E] tracking-tight">
            Doctor Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Claim available AI screening cases, evaluate retinal biomarkers, and submit specialist clinical reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDoctorData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition active:scale-[0.98] disabled:opacity-60"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Claim Success Notification */}
      {claimSuccessMsg && (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm flex items-center justify-between animate-fadeIn"
          role="status"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-emerald-950">{claimSuccessMsg}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                This case has been assigned to you. You can proceed to review the patient's retinal findings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClaimSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Claim Error Alert */}
      {claimErrorMsg && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-sm flex items-center justify-between animate-fadeIn"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-rose-950">Claim Unsuccessful</p>
              <p className="text-xs text-rose-700 mt-0.5">{claimErrorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClaimErrorMsg(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General Error Alert */}
      {error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm flex items-center justify-between"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-rose-900">Unable to load clinical referrals</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDoctorData}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          B. 4 CLINICAL SUMMARY METRIC CARDS
      ───────────────────────────────────────────────────────────── */}
      <section aria-label="Clinical Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Available to Claim */}
        <div
          onClick={() => {
            setStatusFilter("AVAILABLE");
            setSeverityFilter("ALL");
          }}
          className={`relative overflow-hidden rounded-2xl border p-5 bg-white shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === "AVAILABLE" ? "border-amber-500 ring-2 ring-amber-500/15" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Available to Claim
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-amber-700 tracking-tight">
              {summaryCounts.available}
            </p>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unclaimed AI DR cases
            </p>
          </div>
        </div>

        {/* 2. My Assigned Cases */}
        <div
          onClick={() => {
            setStatusFilter("ASSIGNED");
            setSeverityFilter("ALL");
          }}
          className={`relative overflow-hidden rounded-2xl border p-5 bg-white shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === "ASSIGNED" ? "border-[#354DAB] ring-2 ring-[#354DAB]/15" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              My Assigned Cases
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#354DAB] flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-[#354DAB] tracking-tight">
              {summaryCounts.myAssigned}
            </p>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Assigned to you for review
            </p>
          </div>
        </div>

        {/* 3. Urgent High-Risk */}
        <div
          onClick={() => {
            setSeverityFilter("URGENT");
          }}
          className={`relative overflow-hidden rounded-2xl border p-5 bg-white shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
            severityFilter === "URGENT" ? "border-rose-400 ring-2 ring-rose-500/15" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              High Severity
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-rose-700 tracking-tight">
              {summaryCounts.urgentCases}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Severe or Proliferative DR
            </p>
          </div>
        </div>

        {/* 4. Total Reviewed */}
        <div
          onClick={() => {
            setStatusFilter("REVIEWED");
            setSeverityFilter("ALL");
          }}
          className={`relative overflow-hidden rounded-2xl border p-5 bg-white shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === "REVIEWED" ? "border-emerald-400 ring-2 ring-emerald-500/15" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Reviewed
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-[#0A194E] tracking-tight">
              {summaryCounts.totalReviewed}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Completed patient evaluations
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          C & D. SEARCH & FILTER TOOLBAR
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, patient ID, referral #, or AI prediction..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2.5 text-xs sm:text-sm outline-none transition focus:border-[#354DAB] focus:bg-white focus:ring-2 focus:ring-[#354DAB]/15"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter("AVAILABLE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === "AVAILABLE"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Available Cases</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "AVAILABLE" ? "bg-amber-700/90 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {summaryCounts.available}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ASSIGNED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === "ASSIGNED"
                    ? "bg-[#354DAB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>My Assigned</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "ASSIGNED" ? "bg-[#2A3E8C] text-white" : "bg-slate-200 text-slate-700"}`}>
                  {summaryCounts.myAssigned}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("REVIEWED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === "REVIEWED"
                    ? "bg-[#354DAB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Reviewed</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "REVIEWED" ? "bg-[#2A3E8C] text-white" : "bg-slate-200 text-slate-700"}`}>
                  {summaryCounts.totalReviewed}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  statusFilter === "ALL"
                    ? "bg-[#354DAB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>All Cases</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === "ALL" ? "bg-[#2A3E8C] text-white" : "bg-slate-200 text-slate-700"}`}>
                  {referrals.length}
                </span>
              </button>
            </div>

            {/* Severity Filter Dropdown */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#354DAB] focus:bg-white focus:ring-2 focus:ring-[#354DAB]/15"
            >
              <option value="ALL">All Clinical Severities</option>
              <option value="URGENT">URGENT (Proliferative DR)</option>
              <option value="HIGH">HIGH (Severe DR)</option>
              <option value="MEDIUM">MEDIUM (Moderate DR)</option>
              <option value="LOW">LOW (Mild DR)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || statusFilter !== "AVAILABLE" || severityFilter !== "ALL") && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Active Filters:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                Search: "{searchQuery}"
              </span>
            )}
            {statusFilter !== "AVAILABLE" && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                Status: {statusFilter === "ASSIGNED" ? "My Assigned" : statusFilter}
              </span>
            )}
            {severityFilter !== "ALL" && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                Severity: {severityFilter}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("AVAILABLE");
                setSeverityFilter("ALL");
              }}
              className="text-xs font-bold text-rose-600 hover:underline ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          E. CLINICAL REVIEW QUEUE TABLE
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-[#0A194E] tracking-tight flex items-center gap-2">
              {statusFilter === "AVAILABLE" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Available Cases for Specialist Claim</span>
                </>
              )}
              {statusFilter === "ASSIGNED" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#354DAB]"></span>
                  <span>My Assigned Clinical Review Queue</span>
                </>
              )}
              {statusFilter === "REVIEWED" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Completed Clinical Reviews</span>
                </>
              )}
              {statusFilter === "ALL" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span>All Clinical Referrals Queue</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredReferrals.length} patient referral{filteredReferrals.length !== 1 ? "s" : ""}
              {statusFilter === "AVAILABLE" ? " awaiting doctor claim" : ""}
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Sort: <span className="text-[#354DAB] font-bold">Clinical Priority (Proliferative → Mild, Oldest First)</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 space-y-3">
            <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
              <svg className="w-4 h-4 animate-spin text-[#354DAB]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading clinical referrals...</span>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-slate-50 border border-slate-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredReferrals.length === 0 && (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#354DAB]">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {statusFilter === "AVAILABLE"
                ? "No unclaimed cases available right now"
                : statusFilter === "ASSIGNED"
                ? "No cases currently assigned to you"
                : "No referrals match your criteria"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {statusFilter === "AVAILABLE"
                ? "All flagged patient referrals have been claimed or assigned. When new high-risk scans are analyzed, they will appear here."
                : statusFilter === "ASSIGNED"
                ? "You have no active cases pending your review. Switch to 'Available Cases' to claim an unassigned patient."
                : "Try adjusting your search query or filter tags to locate referrals."}
            </p>
            {statusFilter === "ASSIGNED" && summaryCounts.available > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("AVAILABLE")}
                className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
              >
                View {summaryCounts.available} Available Cases to Claim
              </button>
            )}
            {(searchQuery || (statusFilter !== "AVAILABLE" && statusFilter !== "ASSIGNED") || severityFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("AVAILABLE");
                  setSeverityFilter("ALL");
                }}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition ml-2"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Table Content */}
        {!loading && filteredReferrals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 sm:px-6">Case ID</th>
                  <th className="py-3.5 px-4 sm:px-6">Patient Details</th>
                  <th className="py-3.5 px-4 sm:px-6">Priority</th>
                  <th className="py-3.5 px-4 sm:px-6">AI DR Classification</th>
                  <th className="py-3.5 px-4 sm:px-6">AI Confidence</th>
                  <th className="py-3.5 px-4 sm:px-6">Screening Date</th>
                  <th className="py-3.5 px-4 sm:px-6">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredReferrals.map((ref) => {
                  const isAssignedToMe =
                    ref.assigned_doctor && storedUser && Number(ref.assigned_doctor) === Number(storedUser.id);
                  const isAvailable = ref.available_for_claim || (!ref.assigned_doctor && ref.status === "PENDING");
                  const isClaimingThis = claimingId === ref.id;

                  return (
                    <tr
                      key={ref.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Case ID */}
                      <td className="py-4 px-4 sm:px-6">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md text-xs">
                          #{ref.id}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="py-4 px-4 sm:px-6">
                        <div>
                          <p className="font-bold text-[#0A194E] group-hover:text-[#354DAB] transition-colors">
                            {ref.patient_name || `Patient #${ref.patient_id}`}
                          </p>
                          {ref.patient_id && (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              PID: #{ref.patient_id}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Clinical Priority */}
                      <td className="py-4 px-4 sm:px-6">
                        {getPriorityBadge(ref.prediction, ref.priority)}
                      </td>

                      {/* AI Prediction */}
                      <td className="py-4 px-4 sm:px-6">
                        {getPredictionBadge(ref.prediction)}
                      </td>

                      {/* Model Confidence */}
                      <td className="py-4 px-4 sm:px-6">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {formatPercent(ref.confidence ?? ref.ai_report?.confidence)}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 sm:px-6 text-xs text-slate-500">
                        {formatDate(ref.created_at)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 sm:px-6">
                        {getStatusBadge(ref.status, isAvailable)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        {isAvailable ? (
                          <button
                            type="button"
                            onClick={() => handleClaim(ref.id)}
                            disabled={isClaimingThis}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition active:scale-[0.98] disabled:opacity-60"
                          >
                            {isClaimingThis ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                <span>Claiming…</span>
                              </>
                            ) : (
                              <>
                                <span>Claim This Case</span>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </>
                            )}
                          </button>
                        ) : isAssignedToMe && ref.status === "ASSIGNED" ? (
                          <Link
                            to={`/doctor/referrals/${ref.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#354DAB] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-[#2A3E8C] transition active:scale-[0.98]"
                          >
                            <span>Review Case</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </Link>
                        ) : (
                          <Link
                            to={`/doctor/referrals/${ref.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                          >
                            <span>View Assessment</span>
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboardPage;
