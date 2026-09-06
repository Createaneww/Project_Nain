import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchScreeningById,
  analyzeScreening,
  type Screening,
} from "../../../../services/screenings";
import { fetchReportByScreeningId } from "../../../../services/reports";
import { fetchPatientById, type Patient } from "../../../../services/patients";

function HealthWorkerScreeningDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [screening, setScreening] = useState<Screening | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [associatedReportId, setAssociatedReportId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Analysis execution state
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const loadScreeningData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const screeningData = await fetchScreeningById(id);
      setScreening(screeningData);

      if (screeningData.patient) {
        try {
          const patientData = await fetchPatientById(screeningData.patient);
          setPatient(patientData);
        } catch {
          // Patient info fallback from screening serializer
        }
      }

      // Resolve associated report ID from screeningData or backend relationship
      if (screeningData.report_id) {
        setAssociatedReportId(screeningData.report_id);
      } else if (screeningData.status === "COMPLETED") {
        try {
          const rep = await fetchReportByScreeningId(screeningData.id);
          if (rep && rep.id) {
            setAssociatedReportId(rep.id);
          }
        } catch {
          // Report might still be generating
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (
          err.message.toLowerCase().includes("not found") ||
          err.message.includes("404")
        ) {
          setIsNotFound(true);
        }
        setError(err.message);
      } else {
        setError("Failed to load screening details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadScreeningData();
  }, [loadScreeningData]);

  const formatDate = (dateString?: string): string => {
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

  const getImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `http://127.0.0.1:8000${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Trigger AI Analysis
  const handleRunAnalysis = async () => {
    if (!screening || analyzing) return;
    if (screening.status === "COMPLETED") {
      handleViewReport();
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await analyzeScreening(screening.id);
      setScreening((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));

      if (result && result.report_id) {
        setAssociatedReportId(result.report_id);
        navigate(`/health-worker/reports/${result.report_id}`);
      } else {
        const rep = await fetchReportByScreeningId(screening.id);
        if (rep && rep.id) {
          setAssociatedReportId(rep.id);
          navigate(`/health-worker/reports/${rep.id}`);
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes("already been analyzed")) {
          setAnalysisError(null);
          setScreening((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));
          try {
            const rep = await fetchReportByScreeningId(screening.id);
            if (rep && rep.id) {
              setAssociatedReportId(rep.id);
              navigate(`/health-worker/reports/${rep.id}`);
              return;
            }
          } catch {
            await loadScreeningData();
            return;
          }
        }
        setAnalysisError(err.message);
      } else {
        setAnalysisError("AI analysis could not be completed. Please try again later.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Navigate to AI Report
  const handleViewReport = async () => {
    if (!screening) return;
    const reportId = associatedReportId || screening.report_id;
    if (reportId) {
      navigate(`/health-worker/reports/${reportId}`);
      return;
    }

    // Attempt resolving from real database relationship: Screening -> Report -> Report.id
    try {
      const rep = await fetchReportByScreeningId(screening.id);
      if (rep && rep.id) {
        setAssociatedReportId(rep.id);
        navigate(`/health-worker/reports/${rep.id}`);
        return;
      }
    } catch {
      // Report not available yet
    }

    // Do NOT navigate to a fake /reports/{screening.id} URL
    setAnalysisError(
      "No AI report has been generated for this screening yet. Please click 'Run AI Analysis'."
    );
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            COMPLETED
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            ANALYZING
          </span>
        );
      case "IMAGE_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 border border-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            IMAGE UPLOADED
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {s || "CREATED"}
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
              Screening Session
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              Record #{id}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            Screening Details
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Retinal screening session, fundus photograph inspection, and AI analysis runner.
          </p>
        </div>

        {patient ? (
          <Link
            to={`/health-worker/patients/${patient.id}`}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Patient Details</span>
          </Link>
        ) : (
          <Link
            to="/health-worker/screenings"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>All Screenings</span>
          </Link>
        )}
      </div>

      {/* Analysis Error Banner */}
      {analysisError && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-sm flex items-start gap-3"
          role="alert"
        >
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-bold text-rose-900">Analysis Execution Error</p>
            <p className="mt-0.5 text-xs text-rose-700">{analysisError}</p>
          </div>
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State Skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm animate-pulse">
            <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
            <div className="h-4 w-64 bg-slate-100 rounded mb-6" />
            <div className="h-64 bg-slate-100 rounded-xl" />
          </div>
        </div>
      )}

      {/* Not Found */}
      {!loading && isNotFound && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Screening Record Not Found
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            No screening record exists with ID #{id}.
          </p>
          <div className="mt-6">
            <Link
              to="/health-worker/screenings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <span>Return to Screenings Directory</span>
            </Link>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && !isNotFound && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Unable to load screening details</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadScreeningData}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active Analysis Progress Card */}
      {analyzing && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3F54DA] text-white shadow-sm animate-spin">
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F1F5C]">
                Executing AI Diagnostic Pipeline...
              </h3>
              <p className="text-xs text-blue-700 mt-0.5">
                Analyzing retinal fundus features, calculating softmax DR stage probabilities, and generating Grad-CAM heatmap.
              </p>
            </div>
          </div>

          {/* Analysis pipeline visual steps */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 text-xs">
            <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[#3F54DA] font-bold text-[10px]">
                1
              </span>
              <span className="font-semibold text-[11px]">Validating Image</span>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[#3F54DA] font-bold text-[10px]">
                2
              </span>
              <span className="font-semibold text-[11px]">Retinal Features</span>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[#3F54DA] font-bold text-[10px]">
                3
              </span>
              <span className="font-semibold text-[11px]">DR Stage Model</span>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[#3F54DA] font-bold text-[10px]">
                4
              </span>
              <span className="font-semibold text-[11px]">Grad-CAM Heatmap</span>
            </div>
            <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[#3F54DA] font-bold text-[10px]">
                5
              </span>
              <span className="font-semibold text-[11px]">Clinical Report</span>
            </div>
          </div>
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && screening && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Overview & Patient Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Screening Status Banner */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1D4ED8] to-[#3F54DA] text-white shadow-md shadow-blue-950/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl font-bold text-[#0F1F5C] tracking-tight">
                        Screening #{screening.id}
                      </h3>
                      {getStatusBadge(screening.status)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Initiated on {formatDate(screening.created_at)}
                    </p>
                  </div>
                </div>

                {/* Primary Action Button based on Status */}
                {screening.status === "IMAGE_UPLOADED" && (
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={analyzing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3F54DA] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#3F54DA]/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-[#3F54DA]/30 transition duration-150 active:scale-[0.98] disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {analyzing ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        <span>Analyzing Retinal Image...</span>
                      </>
                    ) : (
                      <>
                        <span>Run AI Analysis</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                )}

                {screening.status === "COMPLETED" && (
                  <button
                    type="button"
                    onClick={handleViewReport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition duration-150 active:scale-[0.98]"
                  >
                    <span>View AI Report</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Patient Information Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Patient Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-semibold">Patient Name</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {patient?.full_name || screening.patient_name || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-semibold">Patient ID</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 font-mono">
                      #{screening.patient}
                    </p>
                  </div>
                  {patient && (
                    <>
                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold">Age</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {patient.age} years
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold">Gender</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {patient.gender}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Retinal Fundus Image Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-base font-bold text-[#0F1F5C]">
                  Retinal Fundus Image
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fundus photograph acquired for this screening session.
                </p>
              </div>

              {screening.fundus_image ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 flex items-center justify-center max-h-96">
                  <img
                    src={getImageUrl(screening.fundus_image) || ""}
                    alt={`Fundus Photograph for Screening #${screening.id}`}
                    className="max-h-96 w-full object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-500 text-xs">
                  No image uploaded yet.
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Timeline & Actions */}
          <div className="space-y-6">
            {/* Screening Progress Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h4 className="text-base font-bold text-[#0F1F5C] mb-4">
                Screening Progress
              </h4>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Record Created
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(screening.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full mt-0.5 ${
                      screening.fundus_image
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {screening.fundus_image ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-xs font-bold">2</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Fundus Image Uploaded
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {screening.fundus_image
                        ? "Ready for analysis"
                        : "Pending upload"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full mt-0.5 ${
                      screening.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {screening.status === "COMPLETED" ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <span className="text-xs font-bold">3</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      AI DR Analysis & Report
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {screening.status === "COMPLETED"
                        ? "Analysis complete"
                        : "Awaiting execution"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h4 className="text-base font-bold text-[#0F1F5C] mb-3">
                Actions
              </h4>
              <div className="flex flex-col gap-2.5">
                {screening.status === "COMPLETED" && (
                  <button
                    type="button"
                    onClick={handleViewReport}
                    className="w-full text-center rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
                  >
                    View AI Screening Report &rarr;
                  </button>
                )}
                {patient && (
                  <Link
                    to={`/health-worker/patients/${patient.id}`}
                    className="w-full text-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View Patient Profile
                  </Link>
                )}
                <Link
                  to="/health-worker/screenings"
                  className="w-full text-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to Screenings Directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthWorkerScreeningDetailPage;
