import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import {
  fetchActivityLogs,
  type ActivityLogItem,
} from "../../../services/activity";

function AdminActivityPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("ALL");

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchActivityLogs({
        category: categoryFilter,
        role: roleFilter,
        date_range: dateRangeFilter,
        search: searchQuery,
      });
      setActivities(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load activity logs. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, roleFilter, dateRangeFilter, searchQuery]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

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

  // Summary counts
  const summaryCounts = useMemo(() => {
    const total = activities.length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const today = activities.filter((a) => new Date(a.created_at) >= todayStart).length;

    const clinical = activities.filter((a) =>
      ["REFERRAL", "CLINICAL_EVALUATION", "COLLECTION", "SCREENING", "AI_ANALYSIS"].includes(
        a.category
      )
    ).length;

    const admin = activities.filter(
      (a) =>
        ["USER_MANAGEMENT", "AUTH"].includes(a.category) ||
        a.actor_role === "ADMIN"
    ).length;

    const userMgmt = activities.filter(
      (a) => a.category === "USER_MANAGEMENT"
    ).length;

    return { total, today, clinical, admin, userMgmt };
  }, [activities]);

  // Format event title
  const formatEventName = (eventType: string): string => {
    return eventType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Role Badge Styling
  const getRoleBadge = (role?: string) => {
    const r = (role || "").toUpperCase();
    switch (r) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Admin
          </span>
        );
      case "DOCTOR":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            Doctor
          </span>
        );
      case "HEALTH_WORKER":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Health Worker
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            {r || "System"}
          </span>
        );
    }
  };

  // Category Badge Styling
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "PATIENT":
        return (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            👤 Patient
          </span>
        );
      case "SCREENING":
        return (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            👁️ Screening
          </span>
        );
      case "AI_ANALYSIS":
        return (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
            🤖 AI Analysis
          </span>
        );
      case "REFERRAL":
        return (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            📋 Referral
          </span>
        );
      case "CLINICAL_EVALUATION":
        return (
          <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
            🩺 Clinical Review
          </span>
        );
      case "COLLECTION":
        return (
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            📦 Collection
          </span>
        );
      case "USER_MANAGEMENT":
        return (
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            🛡️ Users
          </span>
        );
      case "AUTH":
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            🔑 Auth
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
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
            <Link
              to="/admin/dashboard"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Dashboard
            </Link>
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Activity Log</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Activity Log & Audit Trail
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor important system activity, clinical workflow events, and administrative actions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={loadActivities}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              🔄 Refresh
            </button>
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
                  Unable to load activity logs
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadActivities}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Summary Cards (5 Cards) */}
        <section aria-label="Activity Metrics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {/* 1. Total Activities */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Activities
                </span>
                <span className="text-lg">📋</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  {summaryCounts.total}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Recorded audit events
                </p>
              </div>
            </div>

            {/* 2. Today's Activities */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Today's Activity
                </span>
                <span className="text-lg">⚡</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.today}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Logged since midnight
                </p>
              </div>
            </div>

            {/* 3. Clinical Activities */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Clinical Workflow
                </span>
                <span className="text-lg">🩺</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.clinical}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Screening & doctor reviews
                </p>
              </div>
            </div>

            {/* 4. Administrative Activities */}
            <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                  Administrative
                </span>
                <span className="text-lg">🛡️</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-purple-700">
                  {summaryCounts.admin}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Admin actions & controls
                </p>
              </div>
            </div>

            {/* 5. User Activities */}
            <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                  User Management
                </span>
                <span className="text-lg">👥</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-rose-700">
                  {summaryCounts.userMgmt}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Account creations & edits
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:col-span-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                🔍
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actor, patient, ID, action..."
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

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Categories</option>
                <option value="PATIENT">Patient</option>
                <option value="SCREENING">Screening</option>
                <option value="AI_ANALYSIS">AI Analysis</option>
                <option value="REFERRAL">Referral</option>
                <option value="CLINICAL_EVALUATION">Clinical Evaluation</option>
                <option value="COLLECTION">Collection</option>
                <option value="USER_MANAGEMENT">User Management</option>
                <option value="AUTH">Authentication</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Administrator</option>
                <option value="DOCTOR">Doctor</option>
                <option value="HEALTH_WORKER">Health Worker</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="7_DAYS">Last 7 Days</option>
                <option value="30_DAYS">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading activity log...</span>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-50 border border-slate-100 animate-pulse"
                ></div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && activities.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                📋
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {searchQuery || categoryFilter !== "ALL" || roleFilter !== "ALL" || dateRangeFilter !== "ALL"
                  ? "No activity logs match your filter criteria."
                  : "No audit activity recorded yet."}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || categoryFilter !== "ALL" || roleFilter !== "ALL" || dateRangeFilter !== "ALL"
                  ? "Try resetting your search query or adjusting your filters."
                  : "Important system and clinical events will appear here in real-time as users perform actions."}
              </p>
              {(searchQuery || categoryFilter !== "ALL" || roleFilter !== "ALL" || dateRangeFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("ALL");
                    setRoleFilter("ALL");
                    setDateRangeFilter("ALL");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Data Table */}
          {!loading && activities.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Activity ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Date & Time</th>
                    <th className="py-3.5 px-4 sm:px-6">User / Actor</th>
                    <th className="py-3.5 px-4 sm:px-6">Role</th>
                    <th className="py-3.5 px-4 sm:px-6">Activity</th>
                    <th className="py-3.5 px-4 sm:px-6">Module</th>
                    <th className="py-3.5 px-4 sm:px-6">Related Record</th>
                    <th className="py-3.5 px-4 sm:px-6">Details</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {activities.map((act) => (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                        #{act.id}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
                        {formatDate(act.created_at)}
                      </td>

                      {/* Actor */}
                      <td className="py-4 px-4 sm:px-6">
                        <span className="font-semibold text-slate-900 block">
                          {act.actor_name}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-4 sm:px-6">
                        {getRoleBadge(act.actor_role)}
                      </td>

                      {/* Activity Name */}
                      <td className="py-4 px-4 sm:px-6">
                        <span className="font-semibold text-slate-800 text-xs">
                          {formatEventName(act.event_type)}
                        </span>
                      </td>

                      {/* Module / Category */}
                      <td className="py-4 px-4 sm:px-6">
                        {getCategoryBadge(act.category)}
                      </td>

                      {/* Related Record */}
                      <td className="py-4 px-4 sm:px-6 text-xs">
                        {act.patient_name || act.patient_id ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {act.patient_name || `Patient #${act.patient_id}`}
                            </span>
                            {act.entity_type && act.entity_id && (
                              <span className="text-slate-400 font-mono block">
                                {act.entity_type} #{act.entity_id}
                              </span>
                            )}
                          </div>
                        ) : act.entity_type && act.entity_id ? (
                          <span className="font-mono text-slate-700">
                            {act.entity_type} #{act.entity_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="py-4 px-4 sm:px-6 text-xs text-slate-600 max-w-xs truncate">
                        {act.details}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <Link
                          to={`/admin/activity/${act.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
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
      </main>
    </div>
  );
}

export default AdminActivityPage;
