import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../../../services/auth";
import { fetchReferrals, type Referral } from "../../../services/referrals";
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

  // Filters state (Default to "PENDING_REVIEW")
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_REVIEW");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  const loadDoctorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsData, referralsData] = await Promise.all([
        fetchDoctorDashboard().catch(() => null),
        fetchReferrals(),
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

  // Calculate summary metrics
  const summaryCounts = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    const pendingReviews = referrals.filter(
      (r) => r.status === "ASSIGNED" || r.status === "PENDING"
    ).length;

    const reviewedToday = referrals.filter((r) => {
      if (!r.reviewed_at) return false;
      return r.reviewed_at.startsWith(todayStr);
    }).length;

    const totalReviewed = referrals.filter(
      (r) => r.status === "REVIEWED" || r.status === "COLLECTED"
    ).length;

    const urgentCases = referrals.filter((r) => {
      const p = (r.prediction || "").toUpperCase();
      return p.includes("SEVERE") || p.includes("PROLIFERATIVE");
    }).length;

    return {
      pendingReviews: dashboardStats?.referrals.assigned ?? pendingReviews,
      reviewedToday,
      totalReviewed:
        dashboardStats?.referrals.reviewed !== undefined
          ? dashboardStats.referrals.reviewed + (dashboardStats.referrals.collected || 0)
          : totalReviewed,
      urgentCases,
      total: referrals.length,
    };
  }, [referrals, dashboardStats]);

  // Filtered referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((ref) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (ref.patient_name || "").toLowerCase().includes(q) ||
        String(ref.patient_id || "").includes(q) ||
        String(ref.id).includes(q) ||
        (ref.prediction || "").toLowerCase().includes(q);

      // Status filter
      let matchesStatus = true;
      if (statusFilter === "PENDING_REVIEW") {
        matchesStatus = ref.status === "ASSIGNED" || ref.status === "PENDING";
      } else if (statusFilter === "REVIEWED") {
        matchesStatus = ref.status === "REVIEWED" || ref.status === "COLLECTED";
      } else if (statusFilter === "ALL") {
        matchesStatus = true;
      }

      // Severity filter
      let matchesSeverity = true;
      const p = (ref.prediction || "").toUpperCase();
      if (severityFilter === "URGENT") {
        matchesSeverity = p.includes("SEVERE") || p.includes("PROLIFERATIVE");
      } else if (severityFilter === "MODERATE") {
        matchesSeverity = p.includes("MODERATE");
      } else if (severityFilter === "MILD") {
        matchesSeverity = p.includes("MILD");
      } else if (severityFilter === "NORMAL") {
        matchesSeverity = p.includes("NO DR") || p.includes("NORMAL");
      }

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [referrals, searchQuery, statusFilter, severityFilter]);

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

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            Pending Review
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Pending Claim
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
            Review AI screening reports, evaluate retinal biomarkers, and finalize clinical patient assessments.
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

      {/* Error Alert */}
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
        {/* 1. Pending Reviews */}
        <div
          onClick={() => {
            setStatusFilter("PENDING_REVIEW");
            setSeverityFilter("ALL");
          }}
          className={`relative overflow-hidden rounded-2xl border p-5 bg-white shadow-sm transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === "PENDING_REVIEW" ? "border-[#354DAB] ring-2 ring-[#354DAB]/15" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Reviews
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#354DAB] flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-[#354DAB] tracking-tight">
              {summaryCounts.pendingReviews}
            </p>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Awaiting doctor evaluation
            </p>
          </div>
        </div>

        {/* 2. Urgent Cases */}
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
              Severe or Proliferative DR cases
            </p>
          </div>
        </div>

        {/* 3. Reviewed Today */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 p-5 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Reviewed Today
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {summaryCounts.reviewedToday}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Evaluated & finalized today
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
            statusFilter === "REVIEWED" ? "border-indigo-400 ring-2 ring-indigo-500/15" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Reviewed
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
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
              All completed patient records
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
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING_REVIEW")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === "PENDING_REVIEW"
                    ? "bg-[#354DAB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pending ({summaryCounts.pendingReviews})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("REVIEWED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === "REVIEWED"
                    ? "bg-[#354DAB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Reviewed ({summaryCounts.totalReviewed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === "ALL"
                    ? "bg-[#354DAB] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({referrals.length})
              </button>
            </div>

            {/* Severity Filter Dropdown */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#354DAB] focus:bg-white focus:ring-2 focus:ring-[#354DAB]/15"
            >
              <option value="ALL">All Severities</option>
              <option value="URGENT">High Severity (Severe / Proliferative)</option>
              <option value="MODERATE">Moderate DR</option>
              <option value="MILD">Mild DR</option>
              <option value="NORMAL">No DR / Normal</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || statusFilter !== "PENDING_REVIEW" || severityFilter !== "ALL") && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Active Filters:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                Search: "{searchQuery}"
              </span>
            )}
            {statusFilter !== "PENDING_REVIEW" && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                Status: {statusFilter}
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
                setStatusFilter("PENDING_REVIEW");
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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-[#0A194E] tracking-tight">
              Clinical Review Queue
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredReferrals.length} patient referral{filteredReferrals.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Sort: <span className="text-[#354DAB] font-bold">Newest First</span>
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
              {statusFilter === "PENDING_REVIEW" && !searchQuery
                ? "No pending patient reviews"
                : "No referrals match your criteria"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {statusFilter === "PENDING_REVIEW" && !searchQuery
                ? "You are all caught up! When field health workers submit high-risk screenings, they will appear in this review queue."
                : "Try adjusting your search query or filter tags to locate referrals."}
            </p>
            {(searchQuery || statusFilter !== "PENDING_REVIEW" || severityFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("PENDING_REVIEW");
                  setSeverityFilter("ALL");
                }}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
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
                  <th className="py-3.5 px-4 sm:px-6">AI DR Classification</th>
                  <th className="py-3.5 px-4 sm:px-6">Screening Date</th>
                  <th className="py-3.5 px-4 sm:px-6">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredReferrals.map((ref) => {
                  const isAssignedToMe =
                    ref.assigned_doctor && storedUser && Number(ref.assigned_doctor) === Number(storedUser.id);
                  const isUnassigned = !ref.assigned_doctor || ref.status === "PENDING";

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

                      {/* AI Prediction */}
                      <td className="py-4 px-4 sm:px-6">
                        {getPredictionBadge(ref.prediction)}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 sm:px-6 text-xs text-slate-500">
                        {formatDate(ref.created_at)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 sm:px-6">
                        {getStatusBadge(ref.status)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        {ref.status === "ASSIGNED" && isAssignedToMe ? (
                          <Link
                            to={`/doctor/referrals/${ref.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#354DAB] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-[#2A3E8C] transition active:scale-[0.98]"
                          >
                            <span>Review Case</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </Link>
                        ) : isUnassigned ? (
                          <Link
                            to={`/doctor/referrals/${ref.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition active:scale-[0.98]"
                          >
                            <span>Claim &amp; Review</span>
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
