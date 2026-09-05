import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../../../services/auth";
import {
  Users,
  Stethoscope,
  UserRound,
  ScanEye,
  BarChart3,
  ClipboardList,
  Package,
  ShieldCheck,
} from "../../../components/AdminIcons";
import {
  fetchAdminDashboard,
  type AdminDashboardData,
} from "../../../services/dashboard";
import { fetchScreenings, type Screening } from "../../../services/screenings";
import { fetchReports, type Report } from "../../../services/reports";
import { fetchReferrals, type Referral } from "../../../services/referrals";

function AdminDashboardPage() {
  const storedUser = getStoredUser();

  const [adminStats, setAdminStats] = useState<AdminDashboardData | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsData, screeningsData, reportsData, referralsData] =
        await Promise.all([
          fetchAdminDashboard().catch(() => null),
          fetchScreenings().catch(() => []),
          fetchReports().catch(() => []),
          fetchReferrals().catch(() => []),
        ]);

      if (statsData) {
        setAdminStats(statsData);
      }
      setScreenings(screeningsData);
      setReports(reportsData);
      setReferrals(referralsData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  // Screening status breakdown
  const screeningCounts = useMemo(() => {
    const created = screenings.filter((s) => s.status === "CREATED").length;
    const uploaded = screenings.filter((s) => s.status === "IMAGE_UPLOADED").length;
    const processing = screenings.filter((s) => s.status === "PROCESSING").length;
    const completed = screenings.filter((s) => s.status === "COMPLETED").length;
    const failed = screenings.filter((s) => s.status === "FAILED").length;
    const total = screenings.length || (adminStats?.screenings.total ?? 0);

    return { total, created, uploaded, processing, completed, failed };
  }, [adminStats, screenings]);

  // Referral status breakdown
  const referralCounts = useMemo(() => {
    const pending = referrals.filter((r) => r.status === "PENDING").length;
    const assigned = referrals.filter((r) => r.status === "ASSIGNED").length;
    const reviewed = referrals.filter((r) => r.status === "REVIEWED").length;
    const collected = referrals.filter((r) => r.status === "COLLECTED").length;
    const total = referrals.length || (adminStats?.referrals.total ?? 0);

    return { total, pending, assigned, reviewed, collected };
  }, [adminStats, referrals]);

  // DR Prediction breakdown
  const predictionCounts = useMemo(() => {
    let noDr = 0;
    let mild = 0;
    let moderate = 0;
    let severe = 0;
    let proliferative = 0;

    reports.forEach((rep) => {
      const p = (rep.prediction || "").toUpperCase();
      if (p.includes("NO DR") || p.includes("NORMAL")) noDr++;
      else if (p.includes("MILD")) mild++;
      else if (p.includes("MODERATE")) moderate++;
      else if (p.includes("SEVERE")) severe++;
      else if (p.includes("PROLIFERATIVE")) proliferative++;
    });

    const totalReports = reports.length;
    return {
      noDr,
      mild,
      moderate,
      severe,
      proliferative,
      totalReports,
      noDrPct: totalReports ? ((noDr / totalReports) * 100).toFixed(1) : "0.0",
      mildPct: totalReports ? ((mild / totalReports) * 100).toFixed(1) : "0.0",
      moderatePct: totalReports ? ((moderate / totalReports) * 100).toFixed(1) : "0.0",
      severePct: totalReports ? ((severe / totalReports) * 100).toFixed(1) : "0.0",
      proliferativePct: totalReports ? ((proliferative / totalReports) * 100).toFixed(1) : "0.0",
    };
  }, [reports]);

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "CREATED").toUpperCase();
    switch (s) {
      case "COMPLETED":
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            {s === "COMPLETED" ? "Completed" : "Reviewed"}
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Processing
          </span>
        );
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            Collected
          </span>
        );
      case "IMAGE_UPLOADED":
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            {s === "IMAGE_UPLOADED" ? "Uploaded" : "Assigned"}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            Failed
          </span>
        );
      case "CREATED":
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            {s === "CREATED" ? "Initiated" : "Pending"}
          </span>
        );
    }
  };

  const adminName = storedUser?.first_name || storedUser?.username || "Administrator";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. PAGE HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A194E] tracking-tight">
            Good morning, {adminName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor healthcare facilities, diabetic retinopathy screening volume, staff operations, and clinical reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
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
            <span>Refresh Analytics</span>
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
              <p className="font-bold text-rose-900">Unable to load administrator analytics</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. KEY METRICS (6 KPI CARDS)
      ───────────────────────────────────────────────────────────── */}
      <section aria-label="Key Metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Patients */}
        <Link
          to="/admin/patients"
          className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#354DAB]/40 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-[#354DAB] transition-colors">
              Patients
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#354DAB] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-[#0A194E] tracking-tight">
              {adminStats?.patients.total ?? 0}
            </p>
            <p className="text-[10px] text-[#354DAB] font-bold mt-1 flex items-center gap-1 group-hover:underline">
              <span>View directory</span>
              <span>→</span>
            </p>
          </div>
        </Link>

        {/* Total Screenings */}
        <Link
          to="/admin/screenings"
          className="rounded-2xl border border-blue-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Screenings
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#354DAB] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-[#354DAB] tracking-tight">
              {screeningCounts.total}
            </p>
            <p className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1 group-hover:underline">
              <span>Sessions hub</span>
              <span>→</span>
            </p>
          </div>
        </Link>

        {/* AI Reports */}
        <Link
          to="/admin/reports"
          className="rounded-2xl border border-indigo-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-400 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              AI Reports
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-indigo-800 tracking-tight">
              {adminStats?.reports.total ?? reports.length}
            </p>
            <p className="text-[10px] text-indigo-600 font-bold mt-1 flex items-center gap-1 group-hover:underline">
              <span>Diagnostic list</span>
              <span>→</span>
            </p>
          </div>
        </Link>

        {/* Referrals */}
        <Link
          to="/admin/referrals"
          className="rounded-2xl border border-emerald-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-400 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Referrals
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-emerald-800 tracking-tight">
              {referralCounts.total}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1 group-hover:underline">
              <span>Triage cases</span>
              <span>→</span>
            </p>
          </div>
        </Link>

        {/* Registered Doctors */}
        <Link
          to="/admin/doctors"
          className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#354DAB]/40 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-[#354DAB] transition-colors">
              Doctors
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#354DAB] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-[#0A194E] tracking-tight">
              {adminStats?.users.doctors ?? 0}
            </p>
            <p className="text-[10px] text-[#354DAB] font-bold mt-1 flex items-center gap-1 group-hover:underline">
              <span>Specialist list</span>
              <span>→</span>
            </p>
          </div>
        </Link>

        {/* Health Workers */}
        <Link
          to="/admin/users"
          className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#354DAB]/40 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-[#354DAB] transition-colors">
              Field Staff
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#354DAB] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-[#0A194E] tracking-tight">
              {adminStats?.users.health_workers ?? 0}
            </p>
            <p className="text-[10px] text-[#354DAB] font-bold mt-1 flex items-center gap-1 group-hover:underline">
              <span>Staff accounts</span>
              <span>→</span>
            </p>
          </div>
        </Link>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. ADMIN ACTION CENTER
      ───────────────────────────────────────────────────────────── */}
      <section aria-label="Admin Actions" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-[#0A194E] uppercase tracking-wider">
            Administrative Action Center
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Platform Management Shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {[
            { label: "Users & Staff", path: "/admin/users", icon: <Users className="w-5 h-5 text-[#1D4ED8]" />, desc: "Accounts" },
            { label: "Doctors", path: "/admin/doctors", icon: <Stethoscope className="w-5 h-5 text-teal-600" />, desc: "Specialists" },
            { label: "Patients", path: "/admin/patients", icon: <UserRound className="w-5 h-5 text-indigo-600" />, desc: "Clinical Registry" },
            { label: "Screenings", path: "/admin/screenings", icon: <ScanEye className="w-5 h-5 text-blue-600" />, desc: "AI Sessions" },
            { label: "Reports", path: "/admin/reports", icon: <BarChart3 className="w-5 h-5 text-sky-600" />, desc: "Grad-CAM Heatmaps" },
            { label: "Referrals", path: "/admin/referrals", icon: <ClipboardList className="w-5 h-5 text-amber-600" />, desc: "Triage" },
            { label: "Collections", path: "/admin/collections", icon: <Package className="w-5 h-5 text-purple-600" />, desc: "Field Deliveries" },
            { label: "Audit Logs", path: "/admin/activity", icon: <ShieldCheck className="w-5 h-5 text-slate-700" />, desc: "Security Activity" },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 text-center hover:bg-blue-50/60 hover:border-[#354DAB]/40 hover:shadow-sm transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white shadow-xs border border-slate-200/60 mb-1.5 group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#354DAB] transition-colors leading-tight">
                {action.label}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                {action.desc}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. SCREENING & REFERRAL LIFECYCLE PROGRESS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Screening Lifecycle */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-[#0A194E]">
                Screening Lifecycle Overview
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of patient screening pipeline stages.
              </p>
            </div>
            <span className="text-xs font-bold text-[#354DAB] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              Total: {screeningCounts.total}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                Initiated
              </span>
              <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                {screeningCounts.created}
              </span>
            </div>

            <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-100">
              <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block">
                Uploaded
              </span>
              <span className="text-xl font-extrabold text-blue-800 mt-1 block">
                {screeningCounts.uploaded}
              </span>
            </div>

            <div className="rounded-xl bg-amber-50/60 p-3.5 border border-amber-200">
              <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block">
                Processing
              </span>
              <span className="text-xl font-extrabold text-amber-800 mt-1 block">
                {screeningCounts.processing}
              </span>
            </div>

            <div className="rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100">
              <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">
                Completed
              </span>
              <span className="text-xl font-extrabold text-emerald-800 mt-1 block">
                {screeningCounts.completed}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
              <span>AI Pipeline Completion Rate</span>
              <span className="font-extrabold text-slate-900">
                {screeningCounts.total
                  ? ((screeningCounts.completed / screeningCounts.total) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#354DAB] rounded-full transition-all duration-500"
                style={{
                  width: `${
                    screeningCounts.total
                      ? Math.min(100, (screeningCounts.completed / screeningCounts.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Referral Lifecycle */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-[#0A194E]">
                Referral &amp; Review Cycle
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specialist doctor assignment, clinical reviews, and report collection.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              Total: {referralCounts.total}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                Pending
              </span>
              <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                {referralCounts.pending}
              </span>
            </div>

            <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-100">
              <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider block">
                Assigned
              </span>
              <span className="text-xl font-extrabold text-blue-800 mt-1 block">
                {referralCounts.assigned}
              </span>
            </div>

            <div className="rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100">
              <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">
                Reviewed
              </span>
              <span className="text-xl font-extrabold text-emerald-800 mt-1 block">
                {referralCounts.reviewed}
              </span>
            </div>

            <div className="rounded-xl bg-indigo-50/60 p-3.5 border border-indigo-100">
              <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider block">
                Collected
              </span>
              <span className="text-xl font-extrabold text-indigo-800 mt-1 block">
                {referralCounts.collected}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
              <span>Clinical Evaluation Rate (Reviewed + Collected)</span>
              <span className="font-extrabold text-slate-900">
                {referralCounts.total
                  ? (((referralCounts.reviewed + referralCounts.collected) / referralCounts.total) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    referralCounts.total
                      ? Math.min(
                          100,
                          ((referralCounts.reviewed + referralCounts.collected) / referralCounts.total) * 100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. DR PREDICTION BREAKDOWN
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#0A194E]">
              Diabetic Retinopathy Diagnostic Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregate AI classification results across all evaluated retinal scans ({predictionCounts.totalReports} total reports).
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#354DAB] border border-blue-200/60">
            AI Findings
          </span>
        </div>

        {predictionCounts.totalReports === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400">
            No screening reports generated yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              {/* No DR */}
              <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-800 block">No DR</span>
                <span className="text-xl font-extrabold text-emerald-950 mt-1 block">
                  {predictionCounts.noDr}
                </span>
                <span className="text-[11px] text-emerald-700 font-mono mt-0.5 block font-bold">
                  {predictionCounts.noDrPct}%
                </span>
              </div>

              {/* Mild */}
              <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200">
                <span className="text-xs font-bold text-amber-800 block">Mild DR</span>
                <span className="text-xl font-extrabold text-amber-950 mt-1 block">
                  {predictionCounts.mild}
                </span>
                <span className="text-[11px] text-amber-700 font-mono mt-0.5 block font-bold">
                  {predictionCounts.mildPct}%
                </span>
              </div>

              {/* Moderate */}
              <div className="rounded-xl bg-orange-50/70 p-3.5 border border-orange-200">
                <span className="text-xs font-bold text-orange-800 block">Moderate DR</span>
                <span className="text-xl font-extrabold text-orange-950 mt-1 block">
                  {predictionCounts.moderate}
                </span>
                <span className="text-[11px] text-orange-700 font-mono mt-0.5 block font-bold">
                  {predictionCounts.moderatePct}%
                </span>
              </div>

              {/* Severe */}
              <div className="rounded-xl bg-rose-50/70 p-3.5 border border-rose-200">
                <span className="text-xs font-bold text-rose-800 block">Severe DR</span>
                <span className="text-xl font-extrabold text-rose-950 mt-1 block">
                  {predictionCounts.severe}
                </span>
                <span className="text-[11px] text-rose-700 font-mono mt-0.5 block font-bold">
                  {predictionCounts.severePct}%
                </span>
              </div>

              {/* Proliferative */}
              <div className="rounded-xl bg-red-50/70 p-3.5 border border-red-200 col-span-2 sm:col-span-1">
                <span className="text-xs font-bold text-red-800 block">Proliferative</span>
                <span className="text-xl font-extrabold text-red-950 mt-1 block">
                  {predictionCounts.proliferative}
                </span>
                <span className="text-[11px] text-red-700 font-mono mt-0.5 block font-bold">
                  {predictionCounts.proliferativePct}%
                </span>
              </div>
            </div>

            {/* Multi-segment visual bar */}
            <div className="pt-2">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${predictionCounts.noDrPct}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`No DR: ${predictionCounts.noDrPct}%`}
                />
                <div
                  style={{ width: `${predictionCounts.mildPct}%` }}
                  className="bg-amber-400 h-full transition-all duration-500"
                  title={`Mild DR: ${predictionCounts.mildPct}%`}
                />
                <div
                  style={{ width: `${predictionCounts.moderatePct}%` }}
                  className="bg-orange-500 h-full transition-all duration-500"
                  title={`Moderate DR: ${predictionCounts.moderatePct}%`}
                />
                <div
                  style={{ width: `${predictionCounts.severePct}%` }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title={`Severe DR: ${predictionCounts.severePct}%`}
                />
                <div
                  style={{ width: `${predictionCounts.proliferativePct}%` }}
                  className="bg-red-600 h-full transition-all duration-500"
                  title={`Proliferative DR: ${predictionCounts.proliferativePct}%`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. RECENT SCREENINGS & CLINICAL CASES
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-[#0A194E]">
              Recent Screenings &amp; Clinical Operations
            </h3>
            <p className="text-xs text-slate-500">
              Latest diagnostic activity recorded across healthcare centers.
            </p>
          </div>
          <Link
            to="/admin/screenings"
            className="text-xs font-bold text-[#354DAB] hover:underline flex items-center gap-1"
          >
            <span>View all screenings</span>
            <span>→</span>
          </Link>
        </div>

        {screenings.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No screening activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-6">Screening ID</th>
                  <th className="py-3 px-6">Patient</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Created By</th>
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {screenings.slice(0, 6).map((sc) => (
                  <tr key={sc.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      <Link
                        to={`/admin/screenings/${sc.id}`}
                        className="text-[#354DAB] hover:underline font-bold"
                      >
                        #{sc.id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-800">
                      {sc.patient ? (
                        <Link
                          to={`/admin/patients/${sc.patient}`}
                          className="font-bold text-slate-900 hover:text-[#354DAB] transition inline-flex items-center gap-1"
                        >
                          <span>{sc.patient_name || `Patient #${sc.patient}`}</span>
                          <span className="text-[10px] text-blue-500">↗</span>
                        </Link>
                      ) : (
                        sc.patient_name || "—"
                      )}
                    </td>
                    <td className="py-3.5 px-6">{getStatusBadge(sc.status)}</td>
                    <td className="py-3.5 px-6 text-slate-500">
                      {sc.created_by_name || "Health Worker"}
                    </td>
                    <td className="py-3.5 px-6 text-slate-400 font-mono">
                      {formatDate(sc.created_at)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/admin/screenings/${sc.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                      >
                        <span>View</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboardPage;
