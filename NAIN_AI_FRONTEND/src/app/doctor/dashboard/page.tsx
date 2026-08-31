import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import { fetchReferrals, type Referral } from "../../../services/referrals";
import {
  fetchDoctorDashboard,
  type DoctorDashboardData,
} from "../../../services/dashboard";
import NotificationBell from "../../../components/NotificationBell";

function DoctorDashboardPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [dashboardStats, setDashboardStats] =
    useState<DoctorDashboardData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state (Default to "PENDING_REVIEW")
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_REVIEW");

  const loadDoctorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch both doctor dashboard metrics and referral list
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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

  // Calculate summary counts
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

    return {
      pendingReviews: dashboardStats?.referrals.assigned ?? pendingReviews,
      reviewedToday,
      totalReviewed:
        dashboardStats?.referrals.reviewed !== undefined
          ? (dashboardStats.referrals.reviewed + (dashboardStats.referrals.collected || 0))
          : totalReviewed,
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
        matchesStatus =
          ref.status === "ASSIGNED" || ref.status === "PENDING";
      } else if (statusFilter === "REVIEWED") {
        matchesStatus =
          ref.status === "REVIEWED" || ref.status === "COLLECTED";
      } else if (statusFilter === "ALL") {
        matchesStatus = true;
      }

      return matchesSearch && matchesStatus;
    });
  }, [referrals, searchQuery, statusFilter]);

  // Prediction badge
  const getPredictionBadge = (prediction?: string) => {
    const p = (prediction || "").toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL")) {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          No DR
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          Mild
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
          Moderate
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          Severe
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          Proliferative
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Pending Review
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Pending Assignment
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/doctor/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Doctor Dashboard"
            >
              👁️
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">NAIN AI</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                  Doctor
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Diabetic Retinopathy Screening System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell role="DOCTOR" />
            {storedUser && (
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Dr. {storedUser.first_name || storedUser.username}
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

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb & Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">Doctor Referrals</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Doctor Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review AI screening reports and finalize patient assessments.
              </p>
            </div>
            <button
              type="button"
              onClick={loadDoctorData}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold text-red-900">
                  Unable to load referrals
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDoctorData}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* TOP SUMMARY CARDS */}
        <section aria-label="Summary Statistics">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Pending Reviews */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Pending Reviews
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                  ⏳
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-bold text-blue-700">
                  {summaryCounts.pendingReviews}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Referrals awaiting your clinical review
                </p>
              </div>
            </div>

            {/* Reviewed Today */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Reviewed Today
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                  📅
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-bold text-emerald-700">
                  {summaryCounts.reviewedToday}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Cases evaluated and finalized today
                </p>
              </div>
            </div>

            {/* Total Reviewed */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Total Reviewed
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
                  ✓
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-bold text-slate-900">
                  {summaryCounts.totalReviewed}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  All completed patient evaluations
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEARCH AND FILTERS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                🔍
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name or ID..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-60">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="PENDING_REVIEW">
                  Pending Review ({summaryCounts.pendingReviews})
                </option>
                <option value="REVIEWED">
                  Reviewed ({summaryCounts.totalReviewed})
                </option>
                <option value="ALL">All Referrals ({referrals.length})</option>
              </select>
            </div>
          </div>
        </div>

        {/* REFERRALS TABLE */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading Skeleton */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading doctor referrals...</span>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-50 border border-slate-100 animate-pulse"
                ></div>
              ))}
            </div>
          )}

          {/* Empty State: No referrals matching query */}
          {!loading && filteredReferrals.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                {statusFilter === "PENDING_REVIEW" ? "🎉" : "📋"}
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {statusFilter === "PENDING_REVIEW" && !searchQuery
                  ? "No pending reviews"
                  : "No referrals found"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter === "PENDING_REVIEW" && !searchQuery
                  ? "There are no patient referrals awaiting review."
                  : "No referrals match your search or filter criteria."}
              </p>
              {(searchQuery || statusFilter !== "PENDING_REVIEW") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("PENDING_REVIEW");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Data Table */}
          {!loading && filteredReferrals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Referral ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Patient</th>
                    <th className="py-3.5 px-4 sm:px-6">AI Prediction</th>
                    <th className="py-3.5 px-4 sm:px-6">Created Date</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredReferrals.map((ref) => (
                    <tr
                      key={ref.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                        {/* Referral ID */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                          #{ref.id}
                        </td>

                        {/* Patient */}
                        <td className="py-4 px-4 sm:px-6">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {ref.patient_name || `Patient #${ref.patient_id}`}
                            </p>
                            {ref.patient_id && (
                              <p className="text-xs text-slate-400 font-mono">
                                ID: #{ref.patient_id}
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
                          {ref.status === "ASSIGNED" &&
                          ref.assigned_doctor === storedUser?.id ? (
                            <Link
                              to={`/doctor/referrals/${ref.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
                            >
                              <span>Review</span>
                              <span>→</span>
                            </Link>
                          ) : !ref.assigned_doctor || ref.status === "PENDING" ? (
                            <Link
                              to={`/doctor/referrals/${ref.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-amber-500/20 hover:bg-amber-700 transition"
                            >
                              <span>Claim / Review</span>
                              <span>→</span>
                            </Link>
                          ) : (
                            <Link
                              to={`/doctor/referrals/${ref.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                              <span>View</span>
                              <span>→</span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default DoctorDashboardPage;
