import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import { fetchScreenings, type Screening } from "../../../services/screenings";
import { fetchReports, type Report } from "../../../services/reports";

function AdminScreeningsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [screeningsData, reportsData] = await Promise.all([
        fetchScreenings(),
        fetchReports().catch(() => []),
      ]);

      setScreenings(screeningsData);
      setReports(reportsData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load screenings list. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Report map by screening ID
  const reportMap = useMemo(() => {
    const map = new Map<number, Report>();
    reports.forEach((r) => {
      if (r.screening_id) {
        map.set(r.screening_id, r);
      }
    });
    return map;
  }, [reports]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const total = screenings.length;
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

    return { total, created, uploaded, processing, completed, failed };
  }, [screenings]);

  // Filtered screenings
  const filteredScreenings = useMemo(() => {
    return screenings.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (s.patient_name || "").toLowerCase().includes(q) ||
        (s.created_by_name || "").toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        String(s.patient).includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        s.status.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [screenings, searchQuery, statusFilter]);

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "CREATED").toUpperCase();
    switch (s) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Completed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Processing
          </span>
        );
      case "IMAGE_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Image Uploaded
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
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Initiated
          </span>
        );
    }
  };

  // Prediction badge styling
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
          <span className="text-slate-800 font-medium">Screening Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Screening Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and monitor patient retinal screenings and AI analysis pipelines.
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
              onClick={loadData}
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
                  Unable to load screenings list
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <section aria-label="Screening Statistics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {/* Total Screenings */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Total Screenings
                </span>
                <span className="text-lg">👁️</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.total}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Lifetime sessions
                </p>
              </div>
            </div>

            {/* Initiated */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Initiated
                </span>
                <span className="text-lg">📝</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  {summaryCounts.created}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  CREATED status
                </p>
              </div>
            </div>

            {/* Image Uploaded */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Uploaded
                </span>
                <span className="text-lg">📷</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.uploaded}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ready for AI scan
                </p>
              </div>
            </div>

            {/* Processing */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Processing
                </span>
                <span className="text-lg">⚙️</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-amber-700">
                  {summaryCounts.processing}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  In AI analysis
                </p>
              </div>
            </div>

            {/* Completed */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Completed
                </span>
                <span className="text-lg">✅</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.completed}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scanned & evaluated
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
                placeholder="Search by patient name, screening ID, or health worker..."
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
                <option value="ALL">All Statuses ({screenings.length})</option>
                <option value="CREATED">Initiated ({summaryCounts.created})</option>
                <option value="IMAGE_UPLOADED">
                  Image Uploaded ({summaryCounts.uploaded})
                </option>
                <option value="PROCESSING">
                  Processing ({summaryCounts.processing})
                </option>
                <option value="COMPLETED">
                  Completed ({summaryCounts.completed})
                </option>
                {summaryCounts.failed > 0 && (
                  <option value="FAILED">Failed ({summaryCounts.failed})</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Screenings Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading screenings list...</span>
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
          {!loading && filteredScreenings.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                👁️
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No screenings found
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "No screenings match your search query or filter. Try clearing filters."
                  : "No screening sessions have been recorded in the system yet."}
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
          {!loading && filteredScreenings.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Screening ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Patient</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6">AI Prediction</th>
                    <th className="py-3.5 px-4 sm:px-6">Created By</th>
                    <th className="py-3.5 px-4 sm:px-6">Date & Time</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredScreenings.map((sc) => {
                    const report = reportMap.get(sc.id);

                    return (
                      <tr
                        key={sc.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Screening ID */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                          #{sc.id}
                        </td>

                        {/* Patient */}
                        <td className="py-4 px-4 sm:px-6">
                          {sc.patient ? (
                            <Link
                              to={`/admin/patients/${sc.patient}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition"
                            >
                              {sc.patient_name || `Patient #${sc.patient}`}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {sc.patient_name || "—"}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 sm:px-6">
                          {getStatusBadge(sc.status)}
                        </td>

                        {/* AI Prediction */}
                        <td className="py-4 px-4 sm:px-6">
                          {report ? (
                            getPredictionBadge(report.prediction)
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              {sc.status === "COMPLETED"
                                ? "Report Processing"
                                : "Pending AI"}
                            </span>
                          )}
                        </td>

                        {/* Created By */}
                        <td className="py-4 px-4 sm:px-6 text-slate-600 text-xs">
                          {sc.created_by_name || "Health Worker"}
                        </td>

                        {/* Date & Time */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
                          {formatDate(sc.created_at)}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <Link
                            to={`/admin/screenings/${sc.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                          >
                            <span>View</span>
                            <span>→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminScreeningsPage;
