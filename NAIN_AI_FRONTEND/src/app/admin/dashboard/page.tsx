import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import {
  fetchAdminDashboard,
  type AdminDashboardData,
} from "../../../services/dashboard";
import { fetchScreenings, type Screening } from "../../../services/screenings";
import { fetchReports, type Report } from "../../../services/reports";
import { fetchReferrals, type Referral } from "../../../services/referrals";
import NotificationBell from "../../../components/NotificationBell";

function AdminDashboardPage() {
  const navigate = useNavigate();
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${day}, ${time}`;
    } catch {
      return dateString;
    }
  };

  // Screening status breakdown - all valid backend statuses
  const screeningCounts = useMemo(() => {
    const created = screenings.filter((s) => s.status === "CREATED").length;
    const uploaded = screenings.filter(
      (s) => s.status === "IMAGE_UPLOADED"
    ).length;
    const processing = screenings.filter(
      (s) => s.status === "PROCESSING"
    ).length;
    const completed = screenings.filter(
      (s) => s.status === "COMPLETED"
    ).length;
    const failed = screenings.filter((s) => s.status === "FAILED").length;

    // Use screenings.length as consistent source of truth
    const total = screenings.length || (adminStats?.screenings.total ?? 0);

    return { total, created, uploaded, processing, completed, failed };
  }, [adminStats, screenings]);

  // Referral status breakdown - all valid backend statuses
  const referralCounts = useMemo(() => {
    const pending = referrals.filter((r) => r.status === "PENDING").length;
    const assigned = referrals.filter((r) => r.status === "ASSIGNED").length;
    const reviewed = referrals.filter((r) => r.status === "REVIEWED").length;
    const collected = referrals.filter((r) => r.status === "COLLECTED").length;

    // Use referrals.length as consistent source of truth
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
      moderatePct: totalReports
        ? ((moderate / totalReports) * 100).toFixed(1)
        : "0.0",
      severePct: totalReports
        ? ((severe / totalReports) * 100).toFixed(1)
        : "0.0",
      proliferativePct: totalReports
        ? ((proliferative / totalReports) * 100).toFixed(1)
        : "0.0",
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Collected
          </span>
        );
      case "IMAGE_UPLOADED":
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            {s === "IMAGE_UPLOADED" ? "Image Uploaded" : "Assigned"}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Admin Dashboard"
            >
              👁️
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">NAIN AI</span>
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-100">
                  Administrator
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Diabetic Retinopathy Screening System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell role="ADMIN" />
            {storedUser && (
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {storedUser.first_name || storedUser.username}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb & Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">System Overview</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                System overview and screening activity.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/admin/patients"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              >
                <span>👥 Patients</span>
                <span>→</span>
              </Link>
              <Link
                to="/admin/doctors"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 hover:bg-teal-700 transition"
              >
                <span>🩺 Doctors</span>
                <span>→</span>
              </Link>
              <Link
                to="/admin/screenings"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 transition"
              >
                <span>👁️ Screenings</span>
                <span>→</span>
              </Link>
              <Link
                to="/admin/reports"
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-cyan-500/20 hover:bg-cyan-700 transition"
              >
                <span>📊 Reports</span>
                <span>→</span>
              </Link>
              <Link
                to="/admin/referrals"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition"
              >
                <span>📋 Referrals</span>
                <span>→</span>
              </Link>
              <Link
                to="/admin/collections"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-500/20 hover:bg-amber-700 transition"
              >
                <span>📥 Collections</span>
                <span>→</span>
              </Link>
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-purple-500/20 hover:bg-purple-700 transition"
              >
                <span>🛡️ Users</span>
                <span>→</span>
              </Link>
              <Link
                to="/admin/activity"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 transition"
              >
                <span>📋 Activity</span>
                <span>→</span>
              </Link>
              <button
                type="button"
                onClick={loadDashboardData}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold text-red-900">
                  Unable to load dashboard data
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDashboardData}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse p-4"
                ></div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-64 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse"></div>
              <div className="h-64 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Loaded Content */}
        {!loading && (
          <div className="space-y-8">
            {/* 1. TOP SUMMARY CARDS */}
            <section aria-label="System Metrics">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {/* Total Patients */}
                <Link
                  to="/admin/patients"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-blue-300 cursor-pointer block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                      Patients
                    </span>
                    <span className="text-lg group-hover:scale-110 transition-transform">👥</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-slate-900">
                      {adminStats?.patients.total ?? 0}
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5 font-medium group-hover:underline flex items-center gap-1">
                      <span>Manage Patients</span>
                      <span>→</span>
                    </p>
                  </div>
                </Link>

                {/* Total Screenings */}
                <Link
                  to="/admin/screenings"
                  className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-blue-400 cursor-pointer block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 group-hover:text-blue-700 transition-colors">
                      Screenings
                    </span>
                    <span className="text-lg group-hover:scale-110 transition-transform">👁️</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-blue-700">
                      {screeningCounts.total}
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5 font-medium group-hover:underline flex items-center gap-1">
                      <span>Manage Screenings</span>
                      <span>→</span>
                    </p>
                  </div>
                </Link>

                {/* Total AI Reports */}
                <Link
                  to="/admin/reports"
                  className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-indigo-400 cursor-pointer block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 group-hover:text-indigo-700 transition-colors">
                      AI Reports
                    </span>
                    <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-indigo-700">
                      {adminStats?.reports.total ?? reports.length}
                    </p>
                    <p className="text-[11px] text-indigo-600 mt-0.5 font-medium group-hover:underline flex items-center gap-1">
                      <span>Manage Reports</span>
                      <span>→</span>
                    </p>
                  </div>
                </Link>

                {/* Total Referrals */}
                <Link
                  to="/admin/referrals"
                  className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-emerald-400 cursor-pointer block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 group-hover:text-emerald-700 transition-colors">
                      Referrals
                    </span>
                    <span className="text-lg group-hover:scale-110 transition-transform">📋</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-emerald-700">
                      {referralCounts.total}
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-0.5 font-medium group-hover:underline flex items-center gap-1">
                      <span>Manage Referrals</span>
                      <span>→</span>
                    </p>
                  </div>
                </Link>

                {/* Total Doctors */}
                <Link
                  to="/admin/doctors"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-teal-400 cursor-pointer block group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-teal-600 transition-colors">
                      Doctors
                    </span>
                    <span className="text-lg group-hover:scale-110 transition-transform">🩺</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-slate-900">
                      {adminStats?.users.doctors ?? 0}
                    </p>
                    <p className="text-[11px] text-teal-600 mt-0.5 font-medium group-hover:underline flex items-center gap-1">
                      <span>Manage Doctors</span>
                      <span>→</span>
                    </p>
                  </div>
                </Link>

                {/* Total Health Workers */}
                <Link
                  to="/admin/users"
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-blue-300 block"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Workers
                    </span>
                    <span className="text-lg">🏥</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-slate-900">
                      {adminStats?.users.health_workers ?? 0}
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5 font-medium">
                      Manage workers →
                    </p>
                  </div>
                </Link>
              </div>
            </section>

            {/* 2. OVERVIEW SECTIONS: SCREENING & REFERRAL WORKFLOW */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Screening Overview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Screening Overview
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patient screening lifecycle progress.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    Total: {screeningCounts.total}
                  </span>
                </div>

                <div className={`grid ${screeningCounts.failed > 0 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"} gap-3 text-center`}>
                  {/* Initiated */}
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block">
                      Initiated
                    </span>
                    <span className="text-xl font-bold text-slate-800 mt-1 block">
                      {screeningCounts.created}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      CREATED
                    </span>
                  </div>

                  {/* Uploaded */}
                  <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium block">
                      Uploaded
                    </span>
                    <span className="text-xl font-bold text-blue-800 mt-1 block">
                      {screeningCounts.uploaded}
                    </span>
                    <span className="text-[10px] text-blue-500 block mt-0.5">
                      IMAGE_UPLOADED
                    </span>
                  </div>

                  {/* Processing */}
                  <div className="rounded-xl bg-amber-50/60 p-3.5 border border-amber-200">
                    <span className="text-xs text-amber-700 font-medium block">
                      Processing
                    </span>
                    <span className="text-xl font-bold text-amber-800 mt-1 block">
                      {screeningCounts.processing}
                    </span>
                    <span className="text-[10px] text-amber-500 block mt-0.5">
                      PROCESSING
                    </span>
                  </div>

                  {/* Completed */}
                  <div className="rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100">
                    <span className="text-xs text-emerald-700 font-medium block">
                      Completed
                    </span>
                    <span className="text-xl font-bold text-emerald-800 mt-1 block">
                      {screeningCounts.completed}
                    </span>
                    <span className="text-[10px] text-emerald-500 block mt-0.5">
                      COMPLETED
                    </span>
                  </div>

                  {/* Failed (if any) */}
                  {screeningCounts.failed > 0 && (
                    <div className="rounded-xl bg-red-50/60 p-3.5 border border-red-100">
                      <span className="text-xs text-red-700 font-medium block">
                        Failed
                      </span>
                      <span className="text-xl font-bold text-red-800 mt-1 block">
                        {screeningCounts.failed}
                      </span>
                      <span className="text-[10px] text-red-500 block mt-0.5">
                        FAILED
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>AI Analysis Completion Rate</span>
                    <span className="font-bold text-slate-900">
                      {screeningCounts.total
                        ? ((screeningCounts.completed / screeningCounts.total) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          screeningCounts.total
                            ? Math.min(100, (screeningCounts.completed / screeningCounts.total) * 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Referral Overview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Referral Overview
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Clinical doctor evaluation and collection cycle.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    Total: {referralCounts.total}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium block">
                      Pending
                    </span>
                    <span className="text-xl font-bold text-slate-800 mt-1 block">
                      {referralCounts.pending}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Unassigned
                    </span>
                  </div>

                  <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-100">
                    <span className="text-xs text-blue-700 font-medium block">
                      Assigned
                    </span>
                    <span className="text-xl font-bold text-blue-800 mt-1 block">
                      {referralCounts.assigned}
                    </span>
                    <span className="text-[10px] text-blue-500 block mt-0.5">
                      With Doctor
                    </span>
                  </div>

                  <div className="rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100">
                    <span className="text-xs text-emerald-700 font-medium block">
                      Reviewed
                    </span>
                    <span className="text-xl font-bold text-emerald-800 mt-1 block">
                      {referralCounts.reviewed}
                    </span>
                    <span className="text-[10px] text-emerald-500 block mt-0.5">
                      Ready Collect
                    </span>
                  </div>

                  <div className="rounded-xl bg-purple-50/60 p-3.5 border border-purple-100">
                    <span className="text-xs text-purple-700 font-medium block">
                      Collected
                    </span>
                    <span className="text-xl font-bold text-purple-800 mt-1 block">
                      {referralCounts.collected}
                    </span>
                    <span className="text-[10px] text-purple-500 block mt-0.5">
                      Finalized
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Clinical Completion (Reviewed + Collected)</span>
                    <span className="font-bold text-slate-900">
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
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DR PREDICTION OVERVIEW */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Diabetic Retinopathy Prediction Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diagnostic distribution across all evaluated retinal scans ({predictionCounts.totalReports} total reports).
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                  AI Model Findings
                </span>
              </div>

              {predictionCounts.totalReports === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400">
                  No screening reports generated yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Distribution Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    {/* No DR */}
                    <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-800 block">
                        No DR
                      </span>
                      <span className="text-xl font-bold text-emerald-950 mt-1 block">
                        {predictionCounts.noDr}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-mono mt-0.5 block">
                        {predictionCounts.noDrPct}%
                      </span>
                    </div>

                    {/* Mild */}
                    <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200">
                      <span className="text-xs font-bold text-amber-800 block">
                        Mild DR
                      </span>
                      <span className="text-xl font-bold text-amber-950 mt-1 block">
                        {predictionCounts.mild}
                      </span>
                      <span className="text-[11px] text-amber-700 font-mono mt-0.5 block">
                        {predictionCounts.mildPct}%
                      </span>
                    </div>

                    {/* Moderate */}
                    <div className="rounded-xl bg-orange-50/70 p-3.5 border border-orange-200">
                      <span className="text-xs font-bold text-orange-800 block">
                        Moderate DR
                      </span>
                      <span className="text-xl font-bold text-orange-950 mt-1 block">
                        {predictionCounts.moderate}
                      </span>
                      <span className="text-[11px] text-orange-700 font-mono mt-0.5 block">
                        {predictionCounts.moderatePct}%
                      </span>
                    </div>

                    {/* Severe */}
                    <div className="rounded-xl bg-rose-50/70 p-3.5 border border-rose-200">
                      <span className="text-xs font-bold text-rose-800 block">
                        Severe DR
                      </span>
                      <span className="text-xl font-bold text-rose-950 mt-1 block">
                        {predictionCounts.severe}
                      </span>
                      <span className="text-[11px] text-rose-700 font-mono mt-0.5 block">
                        {predictionCounts.severePct}%
                      </span>
                    </div>

                    {/* Proliferative */}
                    <div className="rounded-xl bg-red-50/70 p-3.5 border border-red-200 col-span-2 sm:col-span-1">
                      <span className="text-xs font-bold text-red-800 block">
                        Proliferative
                      </span>
                      <span className="text-xl font-bold text-red-950 mt-1 block">
                        {predictionCounts.proliferative}
                      </span>
                      <span className="text-[11px] text-red-700 font-mono mt-0.5 block">
                        {predictionCounts.proliferativePct}%
                      </span>
                    </div>
                  </div>

                  {/* Multi-segment visual bar */}
                  <div className="pt-3">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${predictionCounts.noDrPct}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`No DR: ${predictionCounts.noDrPct}%`}
                      ></div>
                      <div
                        style={{ width: `${predictionCounts.mildPct}%` }}
                        className="bg-amber-400 h-full transition-all duration-500"
                        title={`Mild DR: ${predictionCounts.mildPct}%`}
                      ></div>
                      <div
                        style={{ width: `${predictionCounts.moderatePct}%` }}
                        className="bg-orange-500 h-full transition-all duration-500"
                        title={`Moderate DR: ${predictionCounts.moderatePct}%`}
                      ></div>
                      <div
                        style={{ width: `${predictionCounts.severePct}%` }}
                        className="bg-rose-500 h-full transition-all duration-500"
                        title={`Severe DR: ${predictionCounts.severePct}%`}
                      ></div>
                      <div
                        style={{ width: `${predictionCounts.proliferativePct}%` }}
                        className="bg-red-600 h-full transition-all duration-500"
                        title={`Proliferative DR: ${predictionCounts.proliferativePct}%`}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. RECENT SYSTEM ACTIVITY */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Recent Screenings & Clinical Cases
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Latest activity recorded across healthcare facilities.
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Showing latest {Math.min(5, screenings.length)} cases
                </span>
              </div>

              {screenings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400">
                  No screening activity recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Screening ID</th>
                        <th className="py-3 px-4">Patient</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created By</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {screenings.slice(0, 5).map((sc) => (
                        <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <Link
                              to={`/admin/screenings/${sc.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-bold"
                            >
                              #{sc.id}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {sc.patient ? (
                              <Link
                                to={`/admin/patients/${sc.patient}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1"
                              >
                                <span>{sc.patient_name || `Patient #${sc.patient}`}</span>
                                <span className="text-[10px] text-blue-500">↗</span>
                              </Link>
                            ) : (
                              sc.patient_name || "—"
                            )}
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(sc.status)}</td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {sc.created_by_name || "Health Worker"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono">
                            {formatDate(sc.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              to={`/admin/screenings/${sc.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
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
        )}
      </main>
    </div>
  );
}

export default AdminDashboardPage;
