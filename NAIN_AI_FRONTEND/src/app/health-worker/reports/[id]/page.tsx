import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import {
  fetchReportById,
  resolveImageUrl,
  type Report,
} from "../../../../services/reports";

function HealthWorkerReportPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Image load state trackers
  const [origImageLoaded, setOrigImageLoaded] = useState<boolean>(false);
  const [origImageError, setOrigImageError] = useState<boolean>(false);
  const [gradcamImageLoaded, setGradcamImageLoaded] = useState<boolean>(false);
  const [gradcamImageError, setGradcamImageError] = useState<boolean>(false);

  const loadReportData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const data = await fetchReportById(id);
      setReport(data);
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
        setError("Failed to load clinical AI report. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

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

  const formatConfidence = (conf?: number | null): string => {
    if (conf === undefined || conf === null || isNaN(conf)) return "—";
    const val = conf <= 1 ? conf * 100 : conf;
    return `${val.toFixed(1)}%`;
  };

  const formatPercent = (val?: number | string | null): string => {
    if (val === undefined || val === null) return "0.0%";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0.0%";
    const pct = num <= 1 ? num * 100 : num;
    return `${pct.toFixed(1)}%`;
  };

  const getPercentValue = (val?: number | string | null): number => {
    if (val === undefined || val === null) return 0;
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return 0;
    const pct = num <= 1 ? num * 100 : num;
    return Math.min(Math.max(pct, 0), 100);
  };

  // Severity styles for DR predictions
  const getPredictionStyling = (prediction?: string) => {
    const p = (prediction || "").toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL")) {
      return {
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        heroBg: "bg-emerald-500/10 border-emerald-200",
        heroText: "text-emerald-700",
        barColor: "bg-emerald-500",
        icon: "✅",
        tag: "NORMAL / NO DR",
      };
    }
    if (p.includes("MILD")) {
      return {
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        heroBg: "bg-amber-500/10 border-amber-200",
        heroText: "text-amber-700",
        barColor: "bg-amber-500",
        icon: "⚠️",
        tag: "MILD RETINOPATHY",
      };
    }
    if (p.includes("MODERATE")) {
      return {
        badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
        heroBg: "bg-orange-500/10 border-orange-200",
        heroText: "text-orange-700",
        barColor: "bg-orange-500",
        icon: "⚠️",
        tag: "MODERATE RETINOPATHY",
      };
    }
    if (p.includes("SEVERE")) {
      return {
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        heroBg: "bg-rose-500/10 border-rose-200",
        heroText: "text-rose-700",
        barColor: "bg-rose-600",
        icon: "🚨",
        tag: "SEVERE RETINOPATHY",
      };
    }
    if (p.includes("PROLIFERATIVE")) {
      return {
        badgeBg: "bg-red-50 text-red-700 border-red-200",
        heroBg: "bg-red-500/10 border-red-200",
        heroText: "text-red-700",
        barColor: "bg-red-600",
        icon: "🚨",
        tag: "PROLIFERATIVE RETINOPATHY",
      };
    }
    return {
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
      heroBg: "bg-blue-500/10 border-blue-200",
      heroText: "text-blue-700",
      barColor: "bg-blue-600",
      icon: "ℹ️",
      tag: "SCREENING RESULT",
    };
  };

  const predStyle = getPredictionStyling(report?.prediction);

  // Extract features array
  const getFeaturesList = (): string[] => {
    if (!report?.retinal_analysis) return ["No characteristic DR lesions recorded."];
    if (Array.isArray(report.retinal_analysis)) {
      return report.retinal_analysis;
    }
    if (typeof report.retinal_analysis === "object" && report.retinal_analysis.features) {
      if (Array.isArray(report.retinal_analysis.features)) {
        return report.retinal_analysis.features;
      }
      if (typeof report.retinal_analysis.features === "string") {
        return [report.retinal_analysis.features];
      }
    }
    return ["Analysis findings compiled from retinal examination."];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
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
            {report && (
              <Link
                to={`/health-worker/screenings/${report.screening_id}`}
                className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
              >
                ← Back to Screening
              </Link>
            )}
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

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            to="/health-worker/dashboard"
            className="hover:text-blue-600 transition"
          >
            Dashboard
          </Link>
          <span>/</span>
          <Link
            to="/health-worker/screenings"
            className="hover:text-blue-600 transition"
          >
            Screenings
          </Link>
          <span>/</span>
          {report ? (
            <Link
              to={`/health-worker/screenings/${report.screening_id}`}
              className="hover:text-blue-600 transition"
            >
              Screening #{report.screening_id}
            </Link>
          ) : (
            <span>Screening Details</span>
          )}
          <span>/</span>
          <span className="text-slate-800 font-medium">AI Report</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                AI Screening Report
              </h1>
              {report && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 font-mono">
                  Report #{report.id}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              AI-assisted diabetic retinopathy screening results and retinal image analysis.
            </p>
          </div>

          {report && (
            <div className="flex items-center gap-3">
              <Link
                to={`/health-worker/screenings/${report.screening_id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                ← Back to Screening
              </Link>
            </div>
          )}
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-pulse space-y-4">
              <div className="h-8 w-64 bg-slate-200 rounded"></div>
              <div className="h-4 w-96 bg-slate-100 rounded"></div>
              <div className="h-40 bg-slate-100 rounded-xl"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 rounded-2xl bg-white border border-slate-200 p-6 animate-pulse"></div>
              <div className="h-64 rounded-2xl bg-white border border-slate-200 p-6 animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              📄
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Clinical Report Not Found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No report record exists with ID #{id}.
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

        {/* Error State */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load screening report
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadReportData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* REPORT CONTENT */}
        {!loading && !error && report && (
          <div className="space-y-6">
            {/* A. SCREENING RESULT HERO CARD */}
            <div
              className={`rounded-2xl border p-6 sm:p-8 shadow-sm transition ${predStyle.heroBg}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-6 mb-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    AI Diagnostic Classification
                  </span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {report.prediction || "Undetermined"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${predStyle.badgeBg}`}
                    >
                      <span>{predStyle.icon}</span>
                      <span>{predStyle.tag}</span>
                    </span>
                  </div>
                </div>

                <div className="sm:text-right bg-white/70 rounded-xl p-4 border border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium">Model Confidence</span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                    {formatConfidence(report.confidence)}
                  </p>
                </div>
              </div>

              {/* B. PATIENT + REPORT SUMMARY METADATA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="rounded-xl bg-white/80 p-3.5 border border-slate-200/60">
                  <span className="text-slate-500 font-medium block">Patient Name</span>
                  <span className="font-bold text-slate-900 mt-1 block text-sm">
                    {report.patient_name || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-white/80 p-3.5 border border-slate-200/60">
                  <span className="text-slate-500 font-medium block">Screening ID</span>
                  <Link
                    to={`/health-worker/screenings/${report.screening_id}`}
                    className="font-bold text-blue-600 hover:underline mt-1 block text-sm font-mono"
                  >
                    #{report.screening_id}
                  </Link>
                </div>

                <div className="rounded-xl bg-white/80 p-3.5 border border-slate-200/60">
                  <span className="text-slate-500 font-medium block">Report ID</span>
                  <span className="font-bold text-slate-900 mt-1 block text-sm font-mono">
                    #{report.id}
                  </span>
                </div>

                <div className="rounded-xl bg-white/80 p-3.5 border border-slate-200/60">
                  <span className="text-slate-500 font-medium block">Generated At</span>
                  <span className="font-bold text-slate-900 mt-1 block text-xs">
                    {formatDate(report.generated_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* D. DISEASE PROBABILITY BREAKDOWN */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Disease Probability Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Model softmax probabilities across all diabetic retinopathy severity stages.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                  5 Stage Model
                </span>
              </div>

              <div className="space-y-4">
                {report.probabilities && typeof report.probabilities === "object" ? (
                  Object.entries(report.probabilities).map(([stage, prob]) => {
                    const pctVal = getPercentValue(prob);
                    const isMax =
                      report.prediction &&
                      stage.toLowerCase() === report.prediction.toLowerCase();

                    return (
                      <div key={stage} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-semibold ${
                              isMax ? "text-blue-900 font-bold" : "text-slate-700"
                            }`}
                          >
                            {stage}
                            {isMax && (
                              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                Predicted
                              </span>
                            )}
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatPercent(prob)}
                          </span>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isMax ? predStyle.barColor : "bg-slate-400"
                            }`}
                            style={{ width: `${pctVal}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">
                    Detailed probability distribution not available.
                  </p>
                )}
              </div>
            </div>

            {/* F. RETINAL IMAGE & GRAD-CAM VISUALIZATION */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-base font-bold text-slate-900">
                  Retinal Imaging & Explainable AI (Grad-CAM)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison between raw input fundus photograph and attention heat-map.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Original Fundus Image */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Original Fundus Image
                    </span>
                    <span className="text-[11px] text-slate-400">Input Scan</span>
                  </div>

                  <div className="relative aspect-square w-full rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                    {report.original_image_url ? (
                      <>
                        {!origImageLoaded && !origImageError && (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs gap-2">
                            <span className="animate-spin">🌀</span>
                            <span>Loading original scan...</span>
                          </div>
                        )}
                        <img
                          src={resolveImageUrl(report.original_image_url) || ""}
                          alt="Original Retinal Fundus Scan"
                          onLoad={() => setOrigImageLoaded(true)}
                          onError={() => setOrigImageError(true)}
                          className={`h-full w-full object-contain transition-opacity duration-300 ${
                            origImageLoaded ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {origImageError && (
                          <div className="p-4 text-center text-slate-400 text-xs">
                            <p>⚠️ Unable to load original fundus image.</p>
                            <p className="text-[10px] mt-1 text-slate-500 break-all font-mono">
                              {report.original_image_url}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500 text-xs">
                        Image scan unavailable
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Grad-CAM Visualization */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      AI Attention / Grad-CAM
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">
                      Neural Focus
                    </span>
                  </div>

                  <div className="relative aspect-square w-full rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                    {report.gradcam_url ? (
                      <>
                        {!gradcamImageLoaded && !gradcamImageError && (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs gap-2">
                            <span className="animate-spin">🌀</span>
                            <span>Loading Grad-CAM heatmap...</span>
                          </div>
                        )}
                        <img
                          src={resolveImageUrl(report.gradcam_url) || ""}
                          alt="Grad-CAM Explainable AI Heatmap"
                          onLoad={() => setGradcamImageLoaded(true)}
                          onError={() => setGradcamImageError(true)}
                          className={`h-full w-full object-contain transition-opacity duration-300 ${
                            gradcamImageLoaded ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {gradcamImageError && (
                          <div className="p-4 text-center text-slate-400 text-xs">
                            <p>⚠️ Unable to load Grad-CAM overlay image.</p>
                            <p className="text-[10px] mt-1 text-slate-500 break-all font-mono">
                              {report.gradcam_url}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500 text-xs">
                        Grad-CAM heatmap unavailable
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    Highlighted regions indicate areas that contributed to the AI model's prediction.
                  </p>
                </div>
              </div>
            </div>

            {/* C. IMAGE QUALITY ASSESSMENT & E. RETINAL ANALYSIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* C. IMAGE QUALITY ASSESSMENT */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Image Quality Assessment
                  </h3>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                    {report.quality_data?.overall || "GOOD"}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Passed Checks</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {report.quality_data?.passed_checks ?? 7} / 7
                    </span>
                  </div>

                  {/* Individual quality checks checklist */}
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {[
                      { name: "Resolution", pass: report.quality_data?.resolution_pass ?? true },
                      { name: "Brightness", pass: report.quality_data?.brightness_pass ?? true, val: report.quality_data?.brightness },
                      { name: "Contrast", pass: report.quality_data?.contrast_pass ?? true, val: report.quality_data?.contrast },
                      { name: "Sharpness", pass: report.quality_data?.sharpness_pass ?? true, val: report.quality_data?.sharpness },
                      { name: "Retinal Coverage", pass: report.quality_data?.coverage_pass ?? true, val: report.quality_data?.retinal_ratio },
                      { name: "Fundus Detection", pass: report.quality_data?.fundus_pass ?? true },
                      { name: "Image Cropping", pass: report.quality_data?.cropping_pass ?? true },
                    ].map((chk) => (
                      <div key={chk.name} className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                              chk.pass
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {chk.pass ? "✓" : "✗"}
                          </span>
                          <span className="font-medium text-slate-700">{chk.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {chk.val !== undefined && chk.val !== null && typeof chk.val === "number" && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {chk.val < 1 ? `${(chk.val * 100).toFixed(1)}%` : chk.val.toFixed(2)}
                            </span>
                          )}
                          <span
                            className={`text-[11px] font-semibold ${
                              chk.pass ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {chk.pass ? "PASS" : "FAIL"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* E. RETINAL ANALYSIS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Retinal Analysis & Findings
                    </h3>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                      Stage Findings
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="text-xs font-medium text-slate-500">Detected Stage</span>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {typeof report.retinal_analysis === "object" &&
                        !Array.isArray(report.retinal_analysis) &&
                        report.retinal_analysis?.stage
                          ? report.retinal_analysis.stage
                          : report.prediction}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Key Features & Observations:
                      </h4>
                      <ul className="space-y-2">
                        {getFeaturesList().map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-800"
                          >
                            <span className="text-blue-600 font-bold">•</span>
                            <span className="leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Print / Actions */}
                <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    <span>🖨️</span>
                    <span>Print Report</span>
                  </button>
                  <Link
                    to="/health-worker/screenings"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                  >
                    View All Screenings →
                  </Link>
                </div>
              </div>
            </div>

            {/* G. CLINICAL NOTE / DISCLAIMER */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-sm flex items-start gap-3">
              <span className="text-lg">ℹ️</span>
              <div>
                <p className="font-semibold">Clinical Note & Disclaimer</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  This AI-assisted result is intended to support clinical screening and should be reviewed by a qualified healthcare professional.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default HealthWorkerReportPage;
