import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchReferrals, type Referral } from "../../../services/referrals";

function HealthWorkerReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
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

  // Summary counts
  const summaryCounts = useMemo(() => {
    const readyToCollect = referrals.filter((r) => r.status === "REVIEWED").length;
    const collected = referrals.filter((r) => r.status === "COLLECTED").length;
    const pending = referrals.filter((r) => r.status === "PENDING" || r.status === "ASSIGNED").length;
    const total = referrals.length;
    return { readyToCollect, collected, pending, total };
  }, [referrals]);

  // Filtered referrals list
  const filteredReferrals = useMemo(() => {
    return referrals.filter((ref) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (ref.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        String(ref.patient_id || "").includes(searchQuery.trim()) ||
        String(ref.id).includes(searchQuery.trim());

      const matchesStatus =
        statusFilter === "ALL" ||
        ref.status.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [referrals, searchQuery, statusFilter]);

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
          Mild DR
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
          Moderate DR
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          Severe DR
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          Proliferative DR
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
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Reviewed
          </span>
        );
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Collected
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Assigned
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3F54DA] tracking-wider uppercase">
              Clinical Oversight
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              {referrals.length} Total {referrals.length === 1 ? "Referral" : "Referrals"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            Referral Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track doctor-reviewed cases, assign specialist ophthalmologists, and collect finalized clinical reports.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReferrals}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition shrink-0"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh List</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-sm flex items-center justify-between"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-rose-900">Unable to load referrals list</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadReferrals}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <section aria-label="Summary Statistics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Ready to Collect */}
          <div className="rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ready to Collect
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-emerald-700 tracking-tight">
                {summaryCounts.readyToCollect}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Doctor-reviewed cases ready for patient delivery
              </p>
            </div>
          </div>

          {/* Collected */}
          <div className="rounded-2xl border border-indigo-200/80 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Collected
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-indigo-700 tracking-tight">
                {summaryCounts.collected}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Reports finalized and marked as collected
              </p>
            </div>
          </div>

          {/* Total Referrals */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Referrals
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#3F54DA]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-[#0F1F5C] tracking-tight">
                {summaryCounts.total}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                All active & historical referral cases
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, ID, or referral ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm outline-none transition focus:border-[#3F54DA] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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

          {/* Status Filter Dropdown */}
          <div className="w-full sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm outline-none transition focus:border-[#3F54DA] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="ALL">All Statuses ({referrals.length})</option>
              <option value="REVIEWED">
                Reviewed ({summaryCounts.readyToCollect})
              </option>
              <option value="COLLECTED">
                Collected ({summaryCounts.collected})
              </option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals List Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {/* Loading Skeleton */}
        {loading && (
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
              <svg className="w-5 h-5 animate-spin text-[#3F54DA]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs font-semibold text-slate-500">Loading referral cases...</span>
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
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#3F54DA] border border-blue-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {searchQuery ? "No matching referrals found" : "No referral records available"}
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No referrals matching "${searchQuery}". Try a different search term.`
                : "Referral cases created from positive or inconclusive DR screenings will appear here."}
            </p>
          </div>
        )}

        {/* Referrals Table */}
        {!loading && filteredReferrals.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5 sm:px-6">Case ID</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">AI Prediction</th>
                  <th className="py-3.5 px-4">Doctor Assigned</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-5 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3.5 px-5 sm:px-6 font-mono font-bold text-[#0F1F5C]">
                      #{ref.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">
                        {ref.patient_name || `Patient #${ref.patient_id}`}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Screening #{ref.screening_id}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {getPredictionBadge(ref.prediction)}
                    </td>
                    <td className="py-3.5 px-4">
                      {ref.assigned_doctor_name ? (
                        <span className="font-semibold text-slate-800">
                          Dr. {ref.assigned_doctor_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-amber-600 font-medium text-[11px]">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(ref.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(ref.created_at)}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right">
                      <Link
                        to={`/health-worker/referrals/${ref.id}`}
                        className="inline-flex items-center gap-1 font-bold text-[#3F54DA] hover:text-blue-800 transition"
                      >
                        <span>Manage</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
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

export default HealthWorkerReferralsPage;
