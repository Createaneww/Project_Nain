import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchScreenings, type Screening } from "../../../services/screenings";

function HealthWorkerScreeningsPage() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadScreenings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScreenings();
      setScreenings(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch screenings. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScreenings();
  }, [loadScreenings]);

  // Filtered screenings
  const filteredScreenings = useMemo(() => {
    return screenings.filter((sc) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (sc.patient_name || "").toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        String(sc.id).includes(searchTerm.trim()) ||
        String(sc.patient).includes(searchTerm.trim());

      const matchesStatus =
        statusFilter === "ALL" ||
        sc.status.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [screenings, searchTerm, statusFilter]);

  const counts = useMemo(() => {
    const total = screenings.length;
    const completed = screenings.filter((s) => s.status === "COMPLETED").length;
    const processing = screenings.filter((s) => s.status === "PROCESSING").length;
    const uploaded = screenings.filter((s) => s.status === "IMAGE_UPLOADED" || s.status === "CREATED").length;
    return { total, completed, processing, uploaded };
  }, [screenings]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Analyzing
          </span>
        );
      case "IMAGE_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Uploaded
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status || "Created"}
          </span>
        );
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════════
          PAGE HEADER & PRIMARY CTA
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3F54DA] tracking-wider uppercase">
              Clinical Operations
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              {screenings.length} Total Screening {screenings.length === 1 ? "Session" : "Sessions"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            Screenings & AI Analysis
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse retinal screening sessions, monitor automated diagnostic progress, and review clinical reports.
          </p>
        </div>

        <Link
          to="/health-worker/screenings/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3F54DA] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-[#3F54DA]/20 hover:shadow-lg hover:shadow-[#3F54DA]/30 transition duration-150 active:scale-[0.98] shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Start New Screening</span>
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ERROR ALERT
      ════════════════════════════════════════════════════════════════ */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Failed to load screenings</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadScreenings}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          FILTER TABS & SEARCH
      ════════════════════════════════════════════════════════════════ */}
      <section aria-label="Screenings List" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                statusFilter === "ALL"
                  ? "bg-white text-[#0F1F5C] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                statusFilter === "COMPLETED"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completed ({counts.completed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PROCESSING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                statusFilter === "PROCESSING"
                  ? "bg-white text-[#3F54DA] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Analyzing ({counts.processing})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("IMAGE_UPLOADED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                statusFilter === "IMAGE_UPLOADED"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Uploaded / Pending ({counts.uploaded})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient, ID..."
              className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10 outline-none transition duration-150"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Screenings Table */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-7 h-7 animate-spin text-[#3F54DA] mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-semibold text-slate-500">Loading screening sessions...</span>
          </div>
        ) : filteredScreenings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5 sm:px-6">Screening ID</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Fundus Image</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-5 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredScreenings.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3.5 px-5 sm:px-6 font-mono font-bold text-[#0F1F5C]">
                      #{sc.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{sc.patient_name || `Patient #${sc.patient}`}</p>
                      <p className="text-[11px] text-slate-400">ID: #{sc.patient}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {sc.fundus_image ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Attached</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No image yet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(sc.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(sc.created_at)}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        {sc.status === "COMPLETED" && sc.report_id ? (
                          <Link
                            to={`/health-worker/reports/${sc.report_id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold hover:bg-emerald-600 hover:text-white transition duration-150"
                          >
                            <span>Report</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </Link>
                        ) : (
                          <Link
                            to={`/health-worker/screenings/${sc.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#3F54DA] border border-blue-200/80 font-bold hover:bg-[#3F54DA] hover:text-white transition duration-150"
                          >
                            <span>{sc.status === "COMPLETED" ? "Review" : "Open"}</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {searchTerm || statusFilter !== "ALL" ? "No matching screenings" : "No screening sessions yet"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm || statusFilter !== "ALL"
                ? "Try clearing your filters or changing search keywords."
                : "Initiate an AI screening session for a patient to detect diabetic retinopathy early."}
            </p>
            <div className="mt-4">
              <Link
                to="/health-worker/screenings/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Start First Screening</span>
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default HealthWorkerScreeningsPage;
