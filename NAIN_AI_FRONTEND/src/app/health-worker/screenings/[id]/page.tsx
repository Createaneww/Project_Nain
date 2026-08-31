import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
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
  const storedUser = getStoredUser();

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

      // If status is completed, fetch associated report ID
      if (screeningData.status === "COMPLETED") {
        try {
          const rep = await fetchReportByScreeningId(screeningData.id);
          if (rep && rep.id) {
            setAssociatedReportId(rep.id);
          }
        } catch {
          // Report might still be generating or accessed via direct query
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
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
      if (result && result.report_id) {
        navigate(`/health-worker/reports/${result.report_id}`);
      } else {
        // Fallback: try fetching report by screening ID or refresh
        const rep = await fetchReportByScreeningId(screening.id);
        navigate(`/health-worker/reports/${rep.id}`);
      }
    } catch (err) {
      if (err instanceof Error) {
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
    if (associatedReportId) {
      navigate(`/health-worker/reports/${associatedReportId}`);
      return;
    }

    try {
      const rep = await fetchReportByScreeningId(screening.id);
      if (rep && rep.id) {
        navigate(`/health-worker/reports/${rep.id}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setAnalysisError(err.message);
      } else {
        setAnalysisError("Unable to locate clinical report for this screening.");
      }
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = status || "CREATED";
    switch (s) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            COMPLETED
          </span>
        );
      case "IMAGE_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            IMAGE UPLOADED
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            PROCESSING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            {s}
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
              to="/health-worker/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Return to Dashboard"
            >
              👁️
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">NAIN AI</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                  Health Worker
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Diabetic Retinopathy Screening System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/health-worker/patients"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Patients
            </Link>
            {storedUser && (
              <span className="hidden md:inline-block text-xs font-medium text-slate-500 border-l border-slate-200 pl-3">
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            to="/health-worker/dashboard"
            className="hover:text-blue-600 transition"
          >
            Dashboard
          </Link>
          <span>/</span>
          <Link
            to="/health-worker/patients"
            className="hover:text-blue-600 transition"
          >
            Patients
          </Link>
          <span>/</span>
          {patient ? (
            <Link
              to={`/health-worker/patients/${patient.id}`}
              className="hover:text-blue-600 transition"
            >
              {patient.full_name || `Patient #${patient.id}`}
            </Link>
          ) : (
            <span>Patient</span>
          )}
          <span>/</span>
          <span className="text-slate-800 font-medium">Screening Details</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Screening Details
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Retinal screening session and AI analysis overview.
            </p>
          </div>
          {patient && (
            <Link
              to={`/health-worker/patients/${patient.id}`}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Back to Patient Details
            </Link>
          )}
        </div>

        {/* Analysis Error Banner */}
        {analysisError && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-start gap-3"
            role="alert"
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-900">Analysis Error</p>
              <p className="mt-0.5 text-xs text-red-700">{analysisError}</p>
            </div>
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-pulse">
              <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
              <div className="h-4 w-64 bg-slate-100 rounded mb-6"></div>
              <div className="h-64 bg-slate-100 rounded-xl"></div>
            </div>
          </div>
        )}

        {/* Not Found */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              👁️
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Screening Record Not Found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No screening record exists with ID #{id}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/health-worker/patients"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Patients
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load screening details
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadScreeningData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Analysis Progress Card */}
        {analyzing && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm animate-spin">
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-blue-950">
                  AI is analyzing the retinal image...
                </h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  AI is analyzing the retinal image. This may take a few moments.
                </p>
              </div>
            </div>

            {/* Analysis pipeline visual steps */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 text-xs">
              <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  1
                </span>
                <span className="font-medium text-[11px]">Validating Image</span>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  2
                </span>
                <span className="font-medium text-[11px]">Retinal Features</span>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  3
                </span>
                <span className="font-medium text-[11px]">DR Stage Model</span>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  4
                </span>
                <span className="font-medium text-[11px]">Grad-CAM Heatmap</span>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5 border border-blue-100 text-slate-700 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                  5
                </span>
                <span className="font-medium text-[11px]">Clinical Report</span>
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
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-md shadow-blue-500/20">
                      👁️
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-slate-900">
                          Screening #{screening.id}
                        </h2>
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
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
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
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v8H4z"
                            ></path>
                          </svg>
                          <span>Analyzing Retinal Image...</span>
                        </>
                      ) : (
                        <>
                          <span>Run AI Analysis</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  )}

                  {screening.status === "COMPLETED" && (
                    <button
                      type="button"
                      onClick={handleViewReport}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      <span>View AI Report</span>
                      <span>→</span>
                    </button>
                  )}
                </div>

                {/* Patient Information Grid */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    Patient Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Patient Name</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {patient?.full_name || screening.patient_name || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Patient ID</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 font-mono">
                        #{screening.patient}
                      </p>
                    </div>
                    {patient && (
                      <>
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium">Age</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {patient.age} years
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium">Gender</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {patient.gender}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Retinal Fundus Image Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Retinal Fundus Image
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Fundus photograph acquired for this screening session.
                </p>

                {screening.fundus_image ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 flex items-center justify-center max-h-96">
                    <img
                      src={getImageUrl(screening.fundus_image) || ""}
                      alt={`Fundus Photograph for Screening #${screening.id}`}
                      className="max-h-96 w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500 text-sm">
                    No image uploaded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Timeline & Actions */}
            <div className="space-y-6">
              {/* Screening Progress Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  Screening Progress
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold mt-0.5">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Record Created
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(screening.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                        screening.fundus_image
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {screening.fundus_image ? "✓" : "2"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
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
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                        screening.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {screening.status === "COMPLETED" ? "✓" : "3"}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Actions
                </h3>
                <div className="flex flex-col gap-2.5">
                  {screening.status === "COMPLETED" && (
                    <button
                      type="button"
                      onClick={handleViewReport}
                      className="w-full text-center rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      View AI Screening Report →
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
                    to="/health-worker/patients"
                    className="w-full text-center rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Back to Patients List
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default HealthWorkerScreeningDetailPage;
