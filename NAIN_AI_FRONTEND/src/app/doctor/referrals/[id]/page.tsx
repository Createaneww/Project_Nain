// 
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getStoredUser } from "../../../../services/auth";
import {
  fetchReferralById,
  reviewReferral,
  assignDoctorToReferral,
  claimReferral,
  type Referral,
} from "../../../../services/referrals";
import {
  fetchReportById,
  resolveImageUrl,
  type Report,
} from "../../../../services/reports";

function DoctorReferralReviewPage() {
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
    if (!referral || !storedUser || claiming) return;
    setClaiming(true);
    setClaimError(null);
    setSubmitError(null);
    setError(null);

    try {
      const updated = await claimReferral(referral.id);
      setReferral(updated);
      setClaimError(null);
      setSubmitError(null);
      setError(null);
      try {
        const fresh = await fetchReferralById(referral.id);
        setReferral(fresh);
      } catch {
        // Fallback to updated response
      }
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

    setSubmitError(null);
    setClaimError(null);
    setError(null);

    if (!referral.assigned_doctor) {
      setSubmitError("This referral has not yet been assigned to a doctor.");
      return;
    }

    if (storedUser && Number(referral.assigned_doctor) !== Number(storedUser.id)) {
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
    setSubmitSuccess(null);

    try {
      const updated = await reviewReferral(referral.id, doctorNotes.trim());
      setReferral(updated);
      setSubmitError(null);
      setClaimError(null);
      setError(null);
      setSubmitSuccess("Clinical review finalized and saved successfully!");
      try {
        const fresh = await fetchReferralById(referral.id);
        setReferral(fresh);
      } catch {
        // Fallback to updated response
      }
    } catch (err) {
      setSubmitSuccess(null);
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/80">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
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
            Reviewed &amp; Signed
          </span>
        );
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            Report Collected
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          No DR
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Mild DR
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Moderate DR
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Severe DR
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          Proliferative DR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
        {prediction || "—"}
      </span>
    );
  };

  const isAssignedToCurrentDoctor = Boolean(
    referral &&
      storedUser &&
      referral.assigned_doctor !== null &&
      referral.assigned_doctor !== undefined &&
      Number(referral.assigned_doctor) === Number(storedUser.id)
  );

  const isUnassigned = !referral?.assigned_doctor;

  const isEditable =
    referral &&
    isAssignedToCurrentDoctor &&
    referral.status === "ASSIGNED";

  // Active AI Report context (from referral.ai_report or separately fetched report)
  const displayReport = referral?.ai_report || report;

  // Extract retinal analysis data
  const rawRetinal =
    referral?.retinal_analysis ||
    report?.retinal_analysis ||
    referral?.ai_report?.retinal_analysis;

  const detectedStage =
    referral?.ai_report?.detected_stage ||
    report?.detected_stage ||
    (typeof rawRetinal === "object" && !Array.isArray(rawRetinal) && rawRetinal !== null
      ? ((rawRetinal.stage as string) || (rawRetinal.detected_stage as string))
      : null) ||
    referral?.prediction ||
    report?.prediction ||
    "—";

  // Key Features & Findings
  const extractFeatures = (): string[] => {
    if (
      referral?.ai_report?.retinal_findings &&
      Array.isArray(referral.ai_report.retinal_findings) &&
      referral.ai_report.retinal_findings.length > 0
    ) {
      return referral.ai_report.retinal_findings;
    }
    if (
      referral?.ai_report?.key_features &&
      Array.isArray(referral.ai_report.key_features) &&
      referral.ai_report.key_features.length > 0
    ) {
      return referral.ai_report.key_features;
    }
    if (
      report?.retinal_findings &&
      Array.isArray(report.retinal_findings) &&
      report.retinal_findings.length > 0
    ) {
      return report.retinal_findings;
    }
    if (
      report?.key_features &&
      Array.isArray(report.key_features) &&
      report.key_features.length > 0
    ) {
      return report.key_features;
    }
    if (typeof rawRetinal === "object" && rawRetinal !== null) {
      if (Array.isArray(rawRetinal)) {
        return rawRetinal as string[];
      }
      const rawObj = rawRetinal as Record<string, unknown>;
      if (Array.isArray(rawObj.features)) return rawObj.features as string[];
      if (Array.isArray(rawObj.findings)) return rawObj.findings as string[];
      if (Array.isArray(rawObj.key_features)) return rawObj.key_features as string[];
    }
    return [];
  };

  const retinalFindings = extractFeatures();

  // Additional observations (notes or extra items)
  const additionalObservations: string[] = [];
  if (
    referral?.ai_report?.observations &&
    Array.isArray(referral.ai_report.observations)
  ) {
    referral.ai_report.observations.forEach((obs) => {
      if (!retinalFindings.includes(obs)) {
        additionalObservations.push(obs);
      }
    });
  } else if (report?.observations && Array.isArray(report.observations)) {
    report.observations.forEach((obs) => {
      if (!retinalFindings.includes(obs)) {
        additionalObservations.push(obs);
      }
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER & BACK NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link to="/doctor/dashboard" className="hover:text-[#354DAB] transition">
              Referrals Queue
            </Link>
            <span>/</span>
            <span className="text-slate-700">Case #{id}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A194E] tracking-tight">
            Referral Assessment #{id}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Review AI screening diagnostic output, verify retinal biomarkers, and submit clinical recommendations.
          </p>
        </div>

        <Link
          to="/doctor/dashboard"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Queue</span>
        </Link>
      </div>

      {/* Success Alert */}
      {submitSuccess && (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm flex items-center gap-3 animate-fadeIn"
          role="status"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-emerald-950">{submitSuccess}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              This case is now finalized. Health workers can collect and print the completed medical referral report.
            </p>
          </div>
        </div>
      )}

      {/* Unassigned Warning & Claim Action */}
      {isUnassigned && referral?.status === "PENDING" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-amber-950">Pending Specialist Assignment</h3>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  This referral is in the general pool. Claim this case to assign yourself as the reviewing ophthalmologist.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaimCase}
              disabled={claiming}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition active:scale-[0.98] disabled:opacity-60"
            >
              {claiming ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Claiming Case…</span>
                </>
              ) : (
                <>
                  <span>Claim This Case</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {claimError && (
            <p className="text-xs font-semibold text-rose-700 pl-11">
              {claimError}
            </p>
          )}
        </div>
      )}

      {/* Assigned to another doctor notice */}
      {referral?.assigned_doctor && !isAssignedToCurrentDoctor && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#354DAB] shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900">
              Assigned to Dr. {referral.assigned_doctor_name || `ID #${referral.assigned_doctor}`}
            </p>
            <p className="text-slate-500 mt-0.5">
              This case is assigned to another physician. You can view the diagnostic details, but only the assigned doctor can submit the clinical evaluation.
            </p>
          </div>
        </div>
      )}

      {/* Submit Error Alert */}
      {!submitSuccess && submitError && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm flex items-start gap-3"
          role="alert"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-rose-900">Submission Error</p>
            <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
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
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            Referral Record Not Found
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            No clinical referral record exists with ID #{id}.
          </p>
          <div className="mt-5">
            <Link
              to="/doctor/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#354DAB] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#2A3E8C] transition"
            >
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && referral && (
        <div className="space-y-6">
          {/* ───────────────────────────────────────────────────────────
              1. CASE SUMMARY HERO CARD
          ─────────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Patient Profile
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-extrabold text-[#0A194E] tracking-tight">
                    {referral.patient_name || `Patient #${referral.patient_id}`}
                  </h2>
                  {getStatusBadge(referral.status)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Screening session conducted on: {formatDate(referral.created_at)}
                </p>
              </div>

              <div className="text-left sm:text-right bg-slate-50 p-4 rounded-xl border border-slate-100/80">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  AI Model Assessment
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  {getPredictionBadge(referral.prediction)}
                  {report?.confidence && (
                    <span className="text-xs font-extrabold text-slate-700 font-mono">
                      {formatPercent(report.confidence)} conf.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
                <span className="font-bold text-slate-900 mt-1 block truncate">
                  {referral.assigned_doctor_name ? `Dr. ${referral.assigned_doctor_name}` : "Not assigned"}
                </span>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────
              2. RETINAL IMAGING & EXPLAINABLE AI HEATMAP
          ─────────────────────────────────────────────────────────── */}
          {displayReport && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#0A194E]">
                    Retinal Fundus Scans &amp; Grad-CAM Attention Map
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Comparative view of the raw input fundus photograph and AI attention focus areas.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#354DAB] border border-blue-200/60 uppercase tracking-wider">
                  Deep Learning Output
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Raw Input Scan */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Input Retinal Scan
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Fundus RGB</span>
                  </div>
                  <div className="relative aspect-square w-full rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-800">
                    {(displayReport.original_image_url || displayReport.fundus_image) ? (
                      <img
                        src={resolveImageUrl(displayReport.original_image_url || displayReport.fundus_image) || ""}
                        alt="Input Retinal Scan"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-500 text-xs">Scan image unavailable</span>
                    )}
                  </div>
                </div>

                {/* Grad-CAM Neural Heatmap */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider">
                      Grad-CAM Heatmap
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Explainable AI</span>
                  </div>
                  <div className="relative aspect-square w-full rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-800">
                    {(displayReport.gradcam_url || displayReport.gradcam_image) ? (
                      <img
                        src={resolveImageUrl(displayReport.gradcam_url || displayReport.gradcam_image) || ""}
                        alt="Grad-CAM Overlay"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-500 text-xs">Grad-CAM overlay unavailable</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Probabilities Distribution Breakdown */}
              {displayReport.probabilities && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Stage Probability Distribution
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    {Object.entries(displayReport.probabilities).map(([stage, prob]) => {
                      const numProb = typeof prob === "number" ? prob : parseFloat(String(prob));
                      const isPredicted = referral.prediction?.toUpperCase().includes(stage.toUpperCase());

                      return (
                        <div
                          key={stage}
                          className={`rounded-xl p-3 border text-center transition-all ${
                            isPredicted
                              ? "bg-blue-50/80 border-[#354DAB] ring-1 ring-[#354DAB]/20"
                              : "bg-slate-50 border-slate-200/80"
                          }`}
                        >
                          <span className={`block text-[11px] font-semibold ${isPredicted ? "text-[#354DAB]" : "text-slate-500"}`}>
                            {stage}
                          </span>
                          <span className="font-extrabold text-slate-900 font-mono text-sm mt-1 block">
                            {formatPercent(numProb)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              3. RETINAL ANALYSIS & FINDINGS (AI CLINICAL EVIDENCE)
          ─────────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0A194E]">
                  Retinal Analysis &amp; Findings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deep-learning microvascular lesion detection and biomarker observations from AI Clinical Report.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-200/70 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                AI Generated Findings
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Detected Stage Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Detected Stage
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-[#0A194E]">
                    {detectedStage}
                  </span>
                </div>
                <div>
                  {getPredictionBadge(detectedStage)}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-200/60">
                  Classified severity based on neural feature extraction of fundus microvasculature.
                </p>
              </div>

              {/* 2. Key Features & Observations */}
              <div className="md:col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Key Features &amp; Observations
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {retinalFindings.length} {retinalFindings.length === 1 ? "Biomarker" : "Biomarkers"} Identified
                  </span>
                </div>

                {retinalFindings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {retinalFindings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-blue-100 bg-white p-3 shadow-xs flex items-center gap-3 hover:border-[#354DAB]/40 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#354DAB] flex items-center justify-center shrink-0 border border-blue-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {finding}
                          </p>
                          <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            Detected in scan
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
                    <p className="text-xs font-medium text-slate-500">
                      No characteristic DR lesions or microvascular abnormalities flagged.
                    </p>
                  </div>
                )}

                {/* Additional observations if present */}
                {additionalObservations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Additional Clinical Observations
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                      {additionalObservations.map((obs, idx) => (
                        <li key={idx}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Read-Only Specialist Context Notice */}
            <div className="mt-5 rounded-xl border border-slate-200/60 bg-blue-50/40 p-3.5 flex items-start gap-3">
              <div className="w-5 h-5 rounded-md bg-blue-100 text-[#354DAB] flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong className="text-slate-800 font-semibold">Specialist Review Context (Read-Only):</strong>{" "}
                These automated retinal biomarker findings are compiled directly from the AI Clinical Report to provide complete diagnostic context. The examining doctor must independently evaluate the patient's retinal evidence, formulate the clinical diagnosis, and submit official recommendations below.
              </p>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────
              4. DOCTOR CLINICAL EVALUATION & PRESCRIPTION
          ─────────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-base font-bold text-[#0A194E]">
                Doctor Clinical Evaluation &amp; Prescription
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record specialist ophthalmologist diagnostic impressions, treatment guidance, and follow-up directives.
              </p>
            </div>

            {isEditable ? (
              /* Editable Review Form */
              <form onSubmit={handleSubmitReview} className="space-y-5">
                <div>
                  <label
                    htmlFor="doctorNotes"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
                  >
                    Clinical Findings &amp; Medical Recommendations <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="doctorNotes"
                    rows={6}
                    value={doctorNotes}
                    onChange={(e) => {
                      setDoctorNotes(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder="Document clinical diagnosis, stage validation, follow-up timeline (e.g. 3-month fundus re-scan, OCT exam), dietary/glycemic controls, and prescribed eye drops..."
                    disabled={submitting}
                    className="w-full rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-[#354DAB] focus:ring-2 focus:ring-[#354DAB]/15 disabled:bg-slate-50 font-sans"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    These clinical notes will be digitally signed and attached to the patient's finalized medical report.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Link
                    to="/doctor/dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#354DAB] px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-950/20 transition hover:bg-[#2A3E8C] focus:outline-none focus:ring-2 focus:ring-[#354DAB] active:scale-[0.98] disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Finalizing Clinical Review…</span>
                      </>
                    ) : (
                      <>
                        <span>Submit &amp; Sign Review</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Read-Only Display */
              <div className="space-y-5">
                {referral.status === "REVIEWED" || referral.status === "COLLECTED" ? (
                  <>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3 text-xs text-emerald-900">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold">Evaluation Finalized &amp; Signed</p>
                        <p className="text-[11px] text-emerald-700">
                          Reviewed by Dr. {referral.assigned_doctor_name || storedUser?.username} on {formatDate(referral.reviewed_at)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Recorded Clinical Notes &amp; Recommendations
                      </h4>
                      <div className="rounded-xl bg-slate-50 p-5 border border-slate-100 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                        {referral.doctor_notes || "No notes recorded."}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs text-slate-500 space-y-1.5">
                    <p className="font-bold text-slate-700">
                      {isUnassigned
                        ? "This referral is currently pending specialist assignment."
                        : `This referral is assigned to Dr. ${referral.assigned_doctor_name || "another physician"}.`}
                    </p>
                    <p>
                      {isUnassigned
                        ? "Click 'Claim This Case' above to claim and begin entering your assessment."
                        : "Only the designated doctor can submit clinical review notes."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorReferralReviewPage;