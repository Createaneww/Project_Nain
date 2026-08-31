import { useEffect, useState, useCallback, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import {
  fetchReferralById,
  reviewReferral,
  assignDoctorToReferral,
  type Referral,
} from "../../../../services/referrals";
import {
  fetchReportById,
  resolveImageUrl,
  type Report,
} from "../../../../services/reports";

function DoctorReferralReviewPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Claiming case state
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Form input & submission state
  const [doctorNotes, setDoctorNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const refData = await fetchReferralById(id);
      setReferral(refData);
      if (refData.doctor_notes) {
        setDoctorNotes(refData.doctor_notes);
      }

      // Fetch corresponding AI report
      if (refData.report_id) {
        try {
          const reportData = await fetchReportById(refData.report_id);
          setReport(reportData);
        } catch {
          // Report fallback
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
        setError("Unable to load referral details. Please try again.");
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

  const formatPercent = (val?: number | string | null): string => {
    if (val === undefined || val === null) return "0.0%";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0.0%";
    const pct = num <= 1 ? num * 100 : num;
    return `${pct.toFixed(1)}%`;
  };

  // Claim case as logged in doctor
  const handleClaimCase = async () => {
    if (!referral || !storedUser) return;
    setClaiming(true);
    setClaimError(null);

    try {
      const updated = await assignDoctorToReferral(referral.id, storedUser.id);
      setReferral(updated);
    } catch (err) {
      if (err instanceof Error) {
        setClaimError(err.message || "Failed to claim this referral.");
      } else {
        setClaimError("Failed to claim this referral.");
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!referral) return;

    if (!referral.assigned_doctor) {
      setSubmitError("This referral has not yet been assigned to a doctor.");
      return;
    }

    if (storedUser && referral.assigned_doctor !== storedUser.id) {
      setSubmitError(
        `You are not assigned to review this referral. Assigned to: Dr. ${referral.assigned_doctor_name || "another doctor"}`
      );
      return;
    }

    if (!doctorNotes.trim()) {
      setSubmitError("Please enter clinical evaluation notes before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const updated = await reviewReferral(referral.id, doctorNotes.trim());
      setReferral(updated);
      setSubmitSuccess("Clinical review finalized and saved successfully!");
    } catch (err) {
      if (err instanceof Error) {
        setSubmitError(err.message || "Failed to submit doctor review.");
      } else {
        setSubmitError("Failed to submit doctor review. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Assigned to Doctor
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            Pending Assignment
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Reviewed
          </span>
        );
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Collected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            {s}
          </span>
        );
    }
  };

  // Prediction badge styling
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
          Mild
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
          Moderate
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          Severe
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          Proliferative
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
        {prediction || "—"}
      </span>
    );
  };

  const isAssignedToCurrentDoctor =
    referral && storedUser && referral.assigned_doctor === storedUser.id;

  const isUnassigned = !referral?.assigned_doctor;

  const isEditable =
    referral &&
    isAssignedToCurrentDoctor &&
    referral.status === "ASSIGNED";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/doctor/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Return to Dashboard"
            >
              👁️
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">NAIN AI</span>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                  Doctor
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Diabetic Retinopathy Screening System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/doctor/dashboard"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Dashboard
            </Link>
            {storedUser && (
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Dr. {storedUser.first_name || storedUser.username}
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
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/doctor/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <span>Doctor Referrals</span>
          <span>/</span>
          <span className="text-slate-800 font-medium">Referral Details</span>
        </nav>

        {/* Page Title & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Referral Assessment #{id}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review AI screening diagnostic output and submit clinical recommendations.
            </p>
          </div>
          <Link
            to="/doctor/dashboard"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Success Alert */}
        {submitSuccess && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center gap-3"
            role="status"
          >
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold text-emerald-900">{submitSuccess}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                This case has been moved to Reviewed status and is now available for Health Worker collection.
              </p>
            </div>
          </div>
        )}

        {/* Unassigned Warning & Claim Action */}
        {isUnassigned && referral?.status === "PENDING" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-amber-950">
                    Pending Assignment
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    This referral has not yet been assigned to a doctor. You can claim this case to begin your clinical review.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClaimCase}
                disabled={claiming}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition disabled:bg-amber-400"
              >
                {claiming ? "Claiming..." : "Claim Case →"}
              </button>
            </div>

            {claimError && (
              <p className="text-xs font-semibold text-red-700 pl-8">
                {claimError}
              </p>
            )}
          </div>
        )}

        {/* Assigned to another doctor notice */}
        {referral?.assigned_doctor && !isAssignedToCurrentDoctor && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 shadow-sm flex items-center gap-3">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="font-semibold text-slate-900">
                Assigned to Dr. {referral.assigned_doctor_name || `ID #${referral.assigned_doctor}`}
              </p>
              <p className="text-slate-500 mt-0.5">
                This case is assigned to another physician. You can view its details, but only the assigned doctor can submit the clinical evaluation.
              </p>
            </div>
          </div>
        )}

        {/* Submit Error Alert */}
        {submitError && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-start gap-3"
            role="alert"
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-900">Submission Error</p>
              <p className="mt-0.5 text-xs text-red-700">{submitError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded"></div>
              <div className="h-4 w-64 bg-slate-100 rounded"></div>
              <div className="h-40 bg-slate-100 rounded-xl"></div>
            </div>
          </div>
        )}

        {/* Not Found State */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              📋
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Referral not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No referral record exists with ID #{id}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/doctor/dashboard"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load referral details
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

        {/* Loaded Content */}
        {!loading && !error && referral && (
          <div className="space-y-6">
            {/* 1. CASE HEADER & STATUS CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Patient Case
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {referral.patient_name || `Patient #${referral.patient_id}`}
                    </h2>
                    {getStatusBadge(referral.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Screening date: {formatDate(referral.created_at)}
                  </p>
                </div>

                <div className="text-left sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block">
                    AI Diagnosis
                  </span>
                  <div className="mt-1.5 flex items-center gap-2">
                    {getPredictionBadge(referral.prediction)}
                    {report?.confidence && (
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        {formatPercent(report.confidence)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Referral ID</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 block">
                    #{referral.id}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Patient ID</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 block">
                    #{referral.patient_id}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Screening ID</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 block">
                    #{referral.screening_id}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Assigned Doctor</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {referral.assigned_doctor_name ? `Dr. ${referral.assigned_doctor_name}` : "Not assigned"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. AI SCREENING FINDINGS & RETINAL SCANS */}
            {report && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Retinal Imaging & Explainable AI
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Input fundus scan and Grad-CAM neural attention heatmap.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                    AI Analysis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Original Scan */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                      Original Fundus Scan
                    </span>
                    <div className="relative aspect-square w-full rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                      {report.original_image_url ? (
                        <img
                          src={resolveImageUrl(report.original_image_url) || ""}
                          alt="Input Retinal Scan"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-slate-500 text-xs">Image unavailable</span>
                      )}
                    </div>
                  </div>

                  {/* Grad-CAM Attention Heatmap */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                      Grad-CAM Heatmap
                    </span>
                    <div className="relative aspect-square w-full rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                      {report.gradcam_url ? (
                        <img
                          src={resolveImageUrl(report.gradcam_url) || ""}
                          alt="Grad-CAM Overlay"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-slate-500 text-xs">Grad-CAM unavailable</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Probabilities Preview */}
                {report.probabilities && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Softmax Probabilities
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                      {Object.entries(report.probabilities).map(([stage, prob]) => (
                        <div
                          key={stage}
                          className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 text-center"
                        >
                          <span className="block text-slate-500 text-[11px]">
                            {stage}
                          </span>
                          <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                            {formatPercent(prob)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. DOCTOR REVIEW & CLINICAL RECOMMENDATIONS SECTION */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-base font-bold text-slate-900">
                  Doctor Clinical Review & Prescription
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Document ophthalmologist clinical impressions, follow-up timeline, and medications.
                </p>
              </div>

              {isEditable ? (
                /* Editable Form */
                <form onSubmit={handleSubmitReview} className="space-y-6">
                  <div>
                    <label
                      htmlFor="doctorNotes"
                      className="block text-sm font-semibold text-slate-800 mb-2"
                    >
                      Clinical Evaluation Notes & Prescription <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="doctorNotes"
                      rows={6}
                      value={doctorNotes}
                      onChange={(e) => {
                        setDoctorNotes(e.target.value);
                        if (submitError) setSubmitError(null);
                      }}
                      placeholder="Enter clinical assessment, confirmation of DR stage, recommendations, and follow-up guidance..."
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 font-sans"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      These review notes will be included in the finalized clinical report collected by the Health Worker.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Link
                      to="/doctor/dashboard"
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
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
                          <span>Submitting Review...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Doctor Review</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Read-Only Display of Finalized Review or Unassigned Notice */
                <div className="space-y-5">
                  {referral.status === "REVIEWED" || referral.status === "COLLECTED" ? (
                    <>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3 text-xs text-emerald-900">
                        <span className="text-lg">✓</span>
                        <div>
                          <p className="font-bold">Evaluation Finalized</p>
                          <p className="text-[11px] text-emerald-700">
                            Reviewed by Dr. {referral.assigned_doctor_name || storedUser?.username} on {formatDate(referral.reviewed_at)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                          Recorded Clinical Notes
                        </h4>
                        <div className="rounded-xl bg-slate-50 p-5 border border-slate-100 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                          {referral.doctor_notes || "No notes recorded."}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs text-slate-500 space-y-2">
                      <p className="font-semibold text-slate-700">
                        {isUnassigned
                          ? "This referral has not yet been assigned to a doctor."
                          : `This referral is assigned to Dr. ${referral.assigned_doctor_name || "another physician"}.`}
                      </p>
                      <p>
                        {isUnassigned
                          ? "Click 'Claim Case' above to assign yourself and begin review."
                          : "Only the assigned doctor can enter and submit the clinical review."}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      to="/doctor/dashboard"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      ← Back to Dashboard
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DoctorReferralReviewPage;
