import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import { fetchReports, type Report } from "../../../services/reports";
import { fetchScreenings, type Screening } from "../../../services/screenings";
import { fetchReferrals, type Referral } from "../../../services/referrals";

function AdminReportsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [reports, setReports] = useState<Report[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [predictionFilter, setPredictionFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadReportsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [reportsData, screeningsData, referralsData] = await Promise.all([
        fetchReports(),
        fetchScreenings().catch(() => []),
        fetchReferrals().catch(() => []),
      ]);

      setReports(reportsData);
      setScreenings(screeningsData);
      setReferrals(referralsData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load AI reports. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

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

  // Screening lookup map by screening ID
  const screeningMap = useMemo(() => {
    const map = new Map<number, Screening>();
    screenings.forEach((s) => map.set(s.id, s));
    return map;
  }, [screenings]);

  // Referral lookup map by report ID and screening ID
  const referralByReportIdMap = useMemo(() => {
    const map = new Map<number, Referral>();
    referrals.forEach((r) => {
      if (r.report_id) {
        map.set(r.report_id, r);
      }
      if (r.screening_id) {
        map.set(r.screening_id, r);
      }
    });
    return map;
  }, [referrals]);

  // Helper to categorize prediction into standard bucket
  const getPredictionBucket = (prediction?: string | null): string => {
    if (!prediction) return "OTHER";
    const p = prediction.toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL") || p.includes("NO_DR")) {
      return "NO_DR";
    }
    if (p.includes("MILD")) return "MILD";
    if (p.includes("MODERATE")) return "MODERATE";
    if (p.includes("SEVERE")) return "SEVERE";
    if (p.includes("PROLIFERATIVE")) return "PROLIFERATIVE";
    return "OTHER";
  };

  // Determine report workflow status
  const getReportWorkflowStatus = (report: Report) => {
    const ref = referralByReportIdMap.get(report.id) || referralByReportIdMap.get(report.screening_id);
    if (!ref) return "COMPLETED"; // AI Completed
    return ref.status; // PENDING, ASSIGNED, REVIEWED, COLLECTED
  };

  // Summary Metrics (6 required cards)
  const summaryCounts = useMemo(() => {
    const totalReports = reports.length;
    let noDr = 0;
    let mildModerate = 0;
    let severeProliferative = 0;

    reports.forEach((r) => {
      const bucket = getPredictionBucket(r.prediction);
      if (bucket === "NO_DR") {
        noDr += 1;
      } else if (bucket === "MILD" || bucket === "MODERATE") {
        mildModerate += 1;
      } else if (bucket === "SEVERE" || bucket === "PROLIFERATIVE") {
        severeProliferative += 1;
      }
    });

    const reviewedCases = referrals.filter((r) => r.status === "REVIEWED").length;
    const collectedCases = referrals.filter((r) => r.status === "COLLECTED").length;

    return {
      totalReports,
      noDr,
      mildModerate,
      severeProliferative,
      reviewedCases,
      collectedCases,
    };
  }, [reports, referrals]);

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const sc = screeningMap.get(r.screening_id);
      const ref = referralByReportIdMap.get(r.id) || referralByReportIdMap.get(r.screening_id);
      const q = searchQuery.toLowerCase().trim();

      const patientName = (r.patient_name || sc?.patient_name || ref?.patient_name || "").toLowerCase();
      const patientId = sc?.patient ? String(sc.patient) : ref?.patient_id ? String(ref.patient_id) : "";
      const screeningId = String(r.screening_id);
      const reportId = String(r.id);
      const referralId = ref ? String(ref.id) : "";

      const matchesSearch =
        !q ||
        patientName.includes(q) ||
        patientId.includes(q) ||
        screeningId.includes(q) ||
        reportId.includes(q) ||
        referralId.includes(q);

      // Prediction filter
      const bucket = getPredictionBucket(r.prediction);
      const matchesPrediction =
        predictionFilter === "ALL" ||
        bucket === predictionFilter ||
        (predictionFilter === "MILD" && bucket === "MILD") ||
        (predictionFilter === "MODERATE" && bucket === "MODERATE") ||
        (predictionFilter === "SEVERE" && bucket === "SEVERE") ||
        (predictionFilter === "PROLIFERATIVE" && bucket === "PROLIFERATIVE");

      // Status filter
      const workflowStatus = getReportWorkflowStatus(r);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "COMPLETED" && workflowStatus === "COMPLETED") ||
        (statusFilter === "PENDING" && workflowStatus === "PENDING") ||
        (statusFilter === "ASSIGNED" && workflowStatus === "ASSIGNED") ||
        (statusFilter === "REVIEWED" && workflowStatus === "REVIEWED") ||
        (statusFilter === "COLLECTED" && workflowStatus === "COLLECTED");

      return matchesSearch && matchesPrediction && matchesStatus;
    });
  }, [reports, searchQuery, predictionFilter, statusFilter, screeningMap, referralByReportIdMap]);

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

  // Workflow status badge styling
  const getWorkflowBadge = (status: string) => {
    switch (status) {
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Collected
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Reviewed
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Assigned
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Referred
          </span>
        );
      case "COMPLETED":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
            AI Completed
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
          <span className="text-slate-800 font-medium">Reports Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Reports Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View and manage AI screening reports and completed clinical cases.
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
              onClick={loadReportsData}
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
                  Unable to load AI reports
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadReportsData}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Summary Cards (6 Cards) */}
        <section aria-label="AI Diagnostic Statistics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {/* 1. Total AI Reports */}
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Total AI Reports
                </span>
                <span className="text-lg">📊</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-indigo-700">
                  {summaryCounts.totalReports}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Completed AI analyses
                </p>
              </div>
            </div>

            {/* 2. No DR */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  No DR
                </span>
                <span className="text-lg">🟢</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.noDr}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Normal retinal findings
                </p>
              </div>
            </div>

            {/* 3. Mild / Moderate DR */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Mild / Moderate
                </span>
                <span className="text-lg">🟡</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-amber-700">
                  {summaryCounts.mildModerate}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Early stage changes
                </p>
              </div>
            </div>

            {/* 4. Severe / Proliferative DR */}
            <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                  Severe / Prolif.
                </span>
                <span className="text-lg">🚨</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-rose-700">
                  {summaryCounts.severeProliferative}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  High-priority referrals
                </p>
              </div>
            </div>

            {/* 5. Clinically Reviewed */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Reviewed
                </span>
                <span className="text-lg">🩺</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.reviewedCases}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Doctor evaluated
                </p>
              </div>
            </div>

            {/* 6. Collected Cases */}
            <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                  Collected Cases
                </span>
                <span className="text-lg">📦</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-purple-700">
                  {summaryCounts.collectedCases}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Finalized handovers
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
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
                placeholder="Search by patient name, patient ID, screening ID, or referral ID..."
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

            {/* Prediction Filter */}
            <div className="w-full sm:w-56">
              <select
                value={predictionFilter}
                onChange={(e) => setPredictionFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Predictions ({reports.length})</option>
                <option value="NO_DR">No DR ({summaryCounts.noDr})</option>
                <option value="MILD">Mild DR</option>
                <option value="MODERATE">Moderate DR</option>
                <option value="SEVERE">Severe DR</option>
                <option value="PROLIFERATIVE">Proliferative DR</option>
              </select>
            </div>

            {/* Report Status Filter */}
            <div className="w-full sm:w-56">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Report Statuses</option>
                <option value="COMPLETED">AI Completed</option>
                <option value="PENDING">Referred</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="COLLECTED">Collected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading AI reports...</span>
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
          {!loading && filteredReports.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                📊
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {searchQuery || predictionFilter !== "ALL" || statusFilter !== "ALL"
                  ? "No reports match your search or filters."
                  : "No AI diagnostic reports available yet."}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || predictionFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try adjusting your search terms or resetting the filters."
                  : "Completed diagnostic reports will automatically appear here once fundus scans are processed."}
              </p>
              {(searchQuery || predictionFilter !== "ALL" || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPredictionFilter("ALL");
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
          {!loading && filteredReports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Report / Screening ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Patient</th>
                    <th className="py-3.5 px-4 sm:px-6">AI Prediction</th>
                    <th className="py-3.5 px-4 sm:px-6">Confidence</th>
                    <th className="py-3.5 px-4 sm:px-6">Report Status</th>
                    <th className="py-3.5 px-4 sm:px-6">Assigned Doctor</th>
                    <th className="py-3.5 px-4 sm:px-6">Created Date</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredReports.map((rep) => {
                    const sc = screeningMap.get(rep.screening_id);
                    const ref = referralByReportIdMap.get(rep.id) || referralByReportIdMap.get(rep.screening_id);
                    const patientName = rep.patient_name || sc?.patient_name || ref?.patient_name || "—";
                    const patientId = sc?.patient || ref?.patient_id;
                    const confidenceVal = rep.confidence !== undefined ? rep.confidence : null;
                    const workflowStatus = getReportWorkflowStatus(rep);

                    return (
                      <tr
                        key={rep.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Report / Screening ID */}
                        <td className="py-4 px-4 sm:px-6">
                          <span className="font-mono font-bold text-slate-900 block">
                            Report #{rep.id}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            Screening #{rep.screening_id}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="py-4 px-4 sm:px-6">
                          {patientId ? (
                            <div>
                              <Link
                                to={`/admin/patients/${patientId}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1"
                              >
                                <span>{patientName}</span>
                                <span className="text-[10px] text-blue-500">↗</span>
                              </Link>
                              <p className="text-xs text-slate-400 font-mono">
                                ID: #{patientId}
                              </p>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {patientName}
                            </span>
                          )}
                        </td>

                        {/* AI Prediction */}
                        <td className="py-4 px-4 sm:px-6">
                          {getPredictionBadge(rep.prediction)}
                        </td>

                        {/* Confidence */}
                        <td className="py-4 px-4 sm:px-6 text-xs font-mono">
                          {confidenceVal !== null ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">
                                {(confidenceVal * 100).toFixed(1)}%
                              </span>
                              <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{
                                    width: `${Math.min(100, confidenceVal * 100)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Report Status */}
                        <td className="py-4 px-4 sm:px-6">
                          {getWorkflowBadge(workflowStatus)}
                        </td>

                        {/* Assigned Doctor */}
                        <td className="py-4 px-4 sm:px-6 text-xs">
                          {ref?.assigned_doctor_name ? (
                            <span className="font-semibold text-indigo-700 flex items-center gap-1">
                              <span>🩺</span>
                              <span>Dr. {ref.assigned_doctor_name}</span>
                            </span>
                          ) : ref ? (
                            <span className="text-amber-600 italic">Unassigned</span>
                          ) : (
                            <span className="text-slate-400 italic">No Referral</span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
                          {formatDate(rep.generated_at || sc?.created_at)}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <Link
                            to={`/admin/reports/${rep.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                          >
                            <span>View Report</span>
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

export default AdminReportsPage;
