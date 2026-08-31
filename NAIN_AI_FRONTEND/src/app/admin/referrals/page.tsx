import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import { fetchReferrals, type Referral } from "../../../services/referrals";

function AdminReferralsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchReferrals();
      setReferrals(data);
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
    loadReferrals();
  }, [loadReferrals]);

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

  // Summary counts calculated from real referrals
  const summaryCounts = useMemo(() => {
    const total = referrals.length;
    const pending = referrals.filter((r) => r.status === "PENDING").length;
    const assigned = referrals.filter((r) => r.status === "ASSIGNED").length;
    const reviewed = referrals.filter((r) => r.status === "REVIEWED").length;
    const collected = referrals.filter((r) => r.status === "COLLECTED").length;

    return { total, pending, assigned, reviewed, collected };
  }, [referrals]);

  // Filtered referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.patient_name || "").toLowerCase().includes(q) ||
        (r.assigned_doctor_name || "").toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        String(r.patient_id).includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        r.status.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [referrals, searchQuery, statusFilter]);

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Collected
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Reviewed
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Assigned
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Pending
          </span>
        );
    }
  };

  // Prediction badge
  const getPredictionBadge = (prediction?: string | null) => {
    if (!prediction) {
      return <span className="text-slate-400 italic text-xs">Pending AI</span>;
    }
    const p = prediction.toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          No DR
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          Mild DR
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
          Moderate DR
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          Severe DR
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          Proliferative DR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
        {prediction}
      </span>
    );
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
          <span className="text-slate-800 font-medium">Referral Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Referral Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Monitor and review all patient referrals across the screening system.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/referrals/assign"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 transition"
            >
              <span>🩺 Assign Referrals</span>
              <span>→</span>
            </Link>
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={loadReferrals}
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
                  Unable to load referrals
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadReferrals}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <section aria-label="Referral Statistics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {/* Total Referrals */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Total Referrals
                </span>
                <span className="text-lg">📋</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.total}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Total referral cases
                </p>
              </div>
            </div>

            {/* Pending */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pending
                </span>
                <span className="text-lg">⏳</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-800">
                  {summaryCounts.pending}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Unassigned cases
                </p>
              </div>
            </div>

            {/* Assigned */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Assigned
                </span>
                <span className="text-lg">🩺</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-800">
                  {summaryCounts.assigned}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  With specialist
                </p>
              </div>
            </div>

            {/* Reviewed */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Reviewed
                </span>
                <span className="text-lg">✅</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-800">
                  {summaryCounts.reviewed}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ready to collect
                </p>
              </div>
            </div>

            {/* Collected */}
            <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm transition hover:shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                  Collected
                </span>
                <span className="text-lg">📦</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-purple-800">
                  {summaryCounts.collected}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Finalized reports
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
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
                placeholder="Search by patient name, patient ID, or referral ID..."
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
                <option value="ALL">All Statuses ({referrals.length})</option>
                <option value="PENDING">Pending ({summaryCounts.pending})</option>
                <option value="ASSIGNED">
                  Assigned ({summaryCounts.assigned})
                </option>
                <option value="REVIEWED">
                  Reviewed ({summaryCounts.reviewed})
                </option>
                <option value="COLLECTED">
                  Collected ({summaryCounts.collected})
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading referrals...</span>
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
          {!loading && filteredReferrals.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                📋
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {searchQuery || statusFilter !== "ALL"
                  ? "No referrals match your search or selected filter."
                  : "No referrals found."}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try resetting your search query or selecting a different status filter."
                  : "No specialist referrals have been initiated in the database yet."}
              </p>
              {(searchQuery || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
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
                    <th className="py-3.5 px-4 sm:px-6">Assigned Doctor</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6">Created Date</th>
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
                          {ref.patient_id ? (
                            <Link
                              to={`/admin/patients/${ref.patient_id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1"
                            >
                              <span>{ref.patient_name || `Patient #${ref.patient_id}`}</span>
                              <span className="text-[10px] text-blue-500">↗</span>
                            </Link>
                          ) : (
                            <p className="font-semibold text-slate-900">
                              {ref.patient_name || "—"}
                            </p>
                          )}
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

                      {/* Assigned Doctor */}
                      <td className="py-4 px-4 sm:px-6 text-xs">
                        {ref.assigned_doctor_name ? (
                          <span className="font-semibold text-indigo-700">
                            🩺 {ref.assigned_doctor_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            Not Assigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 sm:px-6">
                        {getStatusBadge(ref.status)}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
                        {formatDate(ref.created_at)}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <Link
                            to={`/admin/referrals/${ref.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                          >
                            <span>View</span>
                            <span>→</span>
                          </Link>
                          {(ref.status === "PENDING" || !ref.assigned_doctor) && (
                            <Link
                              to={`/admin/referrals/${ref.id}`}
                              className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 transition"
                              title="Assign Specialist Doctor"
                            >
                              <span>Assign Doctor</span>
                              <span>→</span>
                            </Link>
                          )}
                        </div>
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

export default AdminReferralsPage;
