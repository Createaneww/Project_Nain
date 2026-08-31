import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Return to Dashboard"
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
              to="/admin/reports"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Reports
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/admin/reports" className="hover:text-blue-600 transition">
            Reports Management
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Report #{id}</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Clinical Screening & AI Diagnostic Report
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Complete case history, AI model inferences, Grad-CAM heatmap, and clinical evaluation records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/reports"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← All Reports
            </Link>
            {referral && (
              <Link
                to={`/admin/referrals/${referral.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100 transition"
              >
                <span>📋 Referral #{referral.id}</span>
                <span>→</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              🖨️ Print
            </button>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              🔄 Refresh
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
              📊
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
                  📊
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
                          <span>🩺</span>
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
                        ✓
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
                          ✓
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
                        ✓
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
                          ✓
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
                          ✓
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
                          ✓
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
                          ✓
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
                    <span className="text-lg">👤</span>
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
                    <span className="text-lg">👁️</span>
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
                      <span className="text-lg">📦</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-purple-700/80">Status:</span>
                      <span className="font-bold text-purple-900">COLLECTED</span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-purple-700/80">Method:</span>
                      <span className="font-semibold text-purple-900">
                        {referral.collected_by_role === "ADMIN"
                          ? "🏢 Admin Office"
                          : "🩺 Health Worker Field"}
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
      </main>
    </div>
  );
}

export default AdminReportDetailPage;
