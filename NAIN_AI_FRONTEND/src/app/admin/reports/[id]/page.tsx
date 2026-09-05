import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchReportById,
  fetchReportByScreeningId,
  type Report,
  resolveImageUrl,
} from "../../../../services/reports";
import {
  fetchScreeningById,
  type Screening,
} from "../../../../services/screenings";
import {
  fetchPatientById,
  type Patient,
} from "../../../../services/patients";
import {
  fetchReferrals,
  type Referral,
} from "../../../../services/referrals";

function AdminReportDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [report, setReport] = useState<Report | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      // 1. Try fetching report directly by ID, or fallback to screeningId
      let repData: Report | null = null;
      try {
        repData = await fetchReportById(id);
      } catch {
        // If not found by report ID, attempt finding report by screening ID
        repData = await fetchReportByScreeningId(id).catch(() => null);
      }

      if (!repData) {
        setIsNotFound(true);
        setError("Report not found for the requested ID.");
        setLoading(false);
        return;
      }

      setReport(repData);

      // 2. Fetch linked screening, referrals, and patient
      const screeningPromise = fetchScreeningById(repData.screening_id).catch(() => null);
      const referralsPromise = fetchReferrals().catch(() => []);

      const [screeningData, referralsList] = await Promise.all([
        screeningPromise,
        referralsPromise,
      ]);

      setScreening(screeningData);

      // Find matching referral if any
      const matchingRef = referralsList.find(
        (r) => r.report_id === repData.id || r.screening_id === repData.screening_id
      );
      setReferral(matchingRef || null);

      // 3. Fetch patient data
      const patientId = screeningData?.patient || matchingRef?.patient_id;
      if (patientId) {
        const patData = await fetchPatientById(patientId).catch(() => null);
        setPatient(patData);
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
        setError("Unable to load report details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Prediction badge styling
  const getPredictionBadge = (prediction?: string | null) => {
    if (!prediction) {
      return <span className="text-slate-400 italic text-xs">Pending AI</span>;
    }
    const p = prediction.toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          No DR (Normal)
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
          Mild DR
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 border border-orange-200">
          Moderate DR
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
          Severe DR
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">
          Proliferative DR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
        {prediction}
      </span>
    );
  };

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "COMPLETED").toUpperCase();
    switch (s) {
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Report Collected
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Doctor Reviewed
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Assigned to Doctor
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Referred (Pending Assignment)
          </span>
        );
      case "COMPLETED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
            AI Completed
          </span>
        );
    }
  };

  const originalImg = resolveImageUrl(
    report?.original_image_url || screening?.fundus_image
  );
  const gradcamImg = resolveImageUrl(report?.gradcam_url);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              AI Diagnostic Record
            </span>
            <span className="text-xs text-slate-400 font-mono">Report #{id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Clinical Screening & AI Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete case history, AI model inferences, Grad-CAM heatmap, and clinical evaluation records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/reports"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Reports
          </Link>
          {referral && (
            <Link
              to={`/admin/referrals/${referral.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 transition"
            >
              <span>Referral #{referral.id}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#354DAB] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-[#2A3E8C] transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-28 rounded-2xl bg-white border border-slate-200 p-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 rounded-2xl bg-white border border-slate-200"></div>
              <div className="h-96 rounded-2xl bg-white border border-slate-200"></div>
            </div>
          </div>
        )}

        {/* Not Found */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Report not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No clinical screening or diagnostic report exists with ID #{id}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/admin/reports"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Reports
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load report details
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded Report View */}
        {!loading && !error && report && (
          <div className="space-y-6">
            {/* Top Status Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-bold text-indigo-700 border border-indigo-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-lg">
                      Report #{report.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      (Screening #{report.screening_id})
                    </span>
                    {getStatusBadge(referral?.status || "COMPLETED")}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Generated on {formatDate(report.generated_at || screening?.created_at)}
                  </p>
                </div>
              </div>

              <div>
                {getPredictionBadge(report.prediction)}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: AI Diagnostic Details & Images */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. RETINAL SCANS & GRAD-CAM HEATMAP */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Retinal Imaging & Deep Learning Visualization
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        High-resolution fundus scan and Grad-CAM attention heatmap highlighting suspicious lesions.
                      </p>
                    </div>
                    {report.confidence !== undefined && (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                        Confidence: {(report.confidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Original Fundus */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600 block">
                        Original Retinal Fundus Scan
                      </span>
                      <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {originalImg ? (
                          <img
                            src={originalImg}
                            alt="Original Retinal Fundus Scan"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            Retinal scan image not available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Grad-CAM */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600 block">
                        Grad-CAM Attention Map Overlay
                      </span>
                      <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {gradcamImg ? (
                          <img
                            src={gradcamImg}
                            alt="Grad-CAM Attention Overlay"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">
                            Attention map not generated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. CLASS PROBABILITIES BREAKDOWN */}
                {report.probabilities && Object.keys(report.probabilities).length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                      DR Severity Class Probabilities
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(report.probabilities).map(([key, val]) => {
                        const num = typeof val === "number" ? val : parseFloat(String(val)) || 0;
                        const pct = num <= 1.0 ? num * 100 : num;
                        const isMain = report.prediction?.toLowerCase().includes(key.toLowerCase());

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className={isMain ? "font-bold text-indigo-700" : "text-slate-700"}>
                                {key.replace(/_/g, " ").toUpperCase()}
                              </span>
                              <span className="font-mono text-slate-600">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isMain ? "bg-indigo-600" : "bg-slate-400"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. CLINICAL DOCTOR EVALUATION (IF REVIEWED) */}
                {referral && (referral.status === "REVIEWED" || referral.status === "COLLECTED" || referral.doctor_notes) && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 sm:p-8 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
                          <span>Ophthalmologist Clinical Review</span>
                        </h3>
                        <p className="text-xs text-emerald-700/80 mt-0.5">
                          Specialist evaluation notes and clinical prescription.
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                        Evaluated
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-xl bg-white p-3.5 border border-emerald-100">
                        <span className="text-slate-400 block">Reviewing Specialist:</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          Dr. {referral.assigned_doctor_name || "Specialist"}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white p-3.5 border border-emerald-100">
                        <span className="text-slate-400 block">Evaluation Date:</span>
                        <span className="font-bold font-mono text-slate-900 text-xs mt-0.5 block">
                          {formatDate(referral.reviewed_at)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-4 border border-emerald-100 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      <span className="text-xs font-bold text-emerald-900 block uppercase tracking-wider mb-1">
                        Doctor Notes & Prescription:
                      </span>
                      {referral.doctor_notes || "No clinical evaluation text recorded."}
                    </div>
                  </div>
                )}

                {/* 4. CASE TIMELINE */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                    Case Lifecycle Timeline
                  </h3>

                  <div className="relative pl-6 space-y-6 border-l-2 border-slate-200">
                    {/* Event 1: Screening Created */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold ring-4 ring-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Screening Session Initiated
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {formatDate(screening?.created_at || report.generated_at)} • By {screening?.created_by_name || "Health Worker"}
                        </p>
                      </div>
                    </div>

                    {/* Event 2: Image Uploaded */}
                    {screening?.fundus_image && (
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold ring-4 ring-white">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Retinal Fundus Image Uploaded
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            High-resolution retinal capture submitted for automated quality assessment.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Event 3: AI Analysis Completed */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold ring-4 ring-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          AI Diagnostic Inference Completed
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {formatDate(report.generated_at || screening?.created_at)} • Diagnosis: {report.prediction} ({report.confidence ? `${(report.confidence * 100).toFixed(1)}%` : "Evaluated"})
                        </p>
                      </div>
                    </div>

                    {/* Event 4: Referral Created */}
                    {referral && (
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold ring-4 ring-white">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Specialist Referral Created (Referral #{referral.id})
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatDate(referral.created_at)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Event 5: Doctor Assigned */}
                    {referral?.assigned_doctor && (
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold ring-4 ring-white">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Doctor Assigned (Dr. {referral.assigned_doctor_name})
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Assigned for comprehensive clinical evaluation and treatment recommendations.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Event 6: Clinical Evaluation Submitted */}
                    {referral?.reviewed_at && (
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold ring-4 ring-white">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Clinical Evaluation Reviewed by Specialist
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatDate(referral.reviewed_at)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Event 7: Report Collected */}
                    {referral?.status === "COLLECTED" && (
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold ring-4 ring-white">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Report Finalized & Collected
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {formatDate(referral.collected_at)} • Collected by {referral.collected_by_name || "Staff"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Metadata Sidebar */}
              <div className="space-y-6">
                {/* 1. PATIENT INFORMATION */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Patient Information
                    </h4>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>

                  <div>
                    {patient ? (
                      <Link
                        to={`/admin/patients/${patient.id}`}
                        className="font-bold text-slate-900 text-base hover:text-blue-600 transition block"
                      >
                        {patient.full_name}
                      </Link>
                    ) : (
                      <p className="font-bold text-slate-900 text-base">
                        {report.patient_name || screening?.patient_name || "—"}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Patient ID: #{patient?.id || screening?.patient || "—"}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    {patient && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Age:</span>
                          <span className="font-semibold text-slate-800">{patient.age} yrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Gender:</span>
                          <span className="font-semibold text-slate-800">{patient.gender}</span>
                        </div>
                        {patient.phone_number && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Phone:</span>
                            <span className="font-semibold font-mono text-slate-800">
                              {patient.phone_number}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Registered:</span>
                          <span className="font-mono text-slate-700">
                            {formatDate(patient.created_at)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {patient && (
                    <Link
                      to={`/admin/patients/${patient.id}`}
                      className="w-full text-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition block mt-2"
                    >
                      View Full Patient Registry →
                    </Link>
                  )}
                </div>

                {/* 2. SCREENING SESSION DETAILS */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold uppercase tracking-wider text-slate-500">
                      Screening Session
                    </h4>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Screening ID:</span>
                    <Link
                      to={`/admin/screenings/${report.screening_id}`}
                      className="font-mono font-bold text-blue-600 hover:underline"
                    >
                      #{report.screening_id}
                    </Link>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Screening Status:</span>
                    <span className="font-semibold text-slate-800">
                      {screening?.status || "COMPLETED"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Created By:</span>
                    <span className="font-medium text-slate-800">
                      {screening?.created_by_name || "Health Worker"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Session Date:</span>
                    <span className="font-mono text-slate-700">
                      {formatDate(screening?.created_at || report.generated_at)}
                    </span>
                  </div>

                  <Link
                    to={`/admin/screenings/${report.screening_id}`}
                    className="w-full text-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition block mt-2"
                  >
                    Open Screening Session →
                  </Link>
                </div>

                {/* 3. COLLECTION INFORMATION (IF COLLECTED) */}
                {referral && referral.status === "COLLECTED" && (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-6 shadow-sm space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                      <h4 className="font-bold uppercase tracking-wider text-purple-900">
                        Collection Details
                      </h4>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-purple-700/80">Status:</span>
                      <span className="font-bold text-purple-900">COLLECTED</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-purple-700/80">Method:</span>
                      <span className="font-semibold text-purple-900">
                        {referral.collected_by_role === "ADMIN"
                          ? "Admin Office"
                          : "Health Worker Field"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-purple-700/80">Collected By:</span>
                      <span className="font-semibold text-purple-900">
                        {referral.collected_by_name || "Staff"}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-purple-700/80">Timestamp:</span>
                      <span className="font-mono text-purple-900">
                        {formatDate(referral.collected_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default AdminReportDetailPage;
