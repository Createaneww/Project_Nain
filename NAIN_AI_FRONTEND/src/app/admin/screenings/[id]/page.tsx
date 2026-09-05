import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchScreeningById,
  type Screening,
} from "../../../../services/screenings";
import {
  fetchReportByScreeningId,
  type Report,
  resolveImageUrl,
} from "../../../../services/reports";
import {
  fetchPatientById,
  type Patient,
} from "../../../../services/patients";
import {
  fetchReferrals,
  type Referral,
} from "../../../../services/referrals";

function AdminScreeningDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [screening, setScreening] = useState<Screening | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const loadScreeningData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const screeningData = await fetchScreeningById(id);
      setScreening(screeningData);

      // Concurrent fetch for patient, report, and referrals
      const promises: [
        Promise<Patient | null>,
        Promise<Report | null>,
        Promise<Referral[]>
      ] = [
        screeningData.patient
          ? fetchPatientById(screeningData.patient).catch(() => null)
          : Promise.resolve(null),
        screeningData.status === "COMPLETED"
          ? fetchReportByScreeningId(screeningData.id).catch(() => null)
          : Promise.resolve(null),
        fetchReferrals({ patient_id: screeningData.patient }).catch(() => []),
      ];

      const [patientData, reportData, referralsData] = await Promise.all(
        promises
      );

      setPatient(patientData);
      setReport(reportData);

      // Find referral matching this screening/report
      const matchedRef =
        referralsData.find(
          (r) =>
            r.screening_id === screeningData.id ||
            (reportData && r.report_id === reportData.id)
        ) || null;
      setReferral(matchedRef);
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

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "CREATED").toUpperCase();
    switch (s) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Analysis Completed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Processing in AI Pipeline
          </span>
        );
      case "IMAGE_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Image Uploaded
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            Analysis Failed
          </span>
        );
      case "CREATED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Session Initiated
          </span>
        );
    }
  };

  // Prediction badge
  const getPredictionBadge = (prediction?: string | null) => {
    if (!prediction) {
      return <span className="text-slate-400 italic text-xs">Pending AI</span>;
    }
    const p = prediction.toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          No Diabetic Retinopathy
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
          Mild Non-Proliferative DR
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 border border-orange-200">
          Moderate Non-Proliferative DR
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
          Severe Non-Proliferative DR
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

  const fundusUrl =
    report?.original_image_url
      ? resolveImageUrl(report.original_image_url)
      : screening?.fundus_image
      ? resolveImageUrl(screening.fundus_image)
      : null;

  const gradcamUrl = resolveImageUrl(report?.gradcam_url);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top action / navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              Session Inspection
            </span>
            <span className="text-xs text-slate-400 font-mono">#{id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Screening Session #{id}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Session timeline, fundus camera scans, and Deep Learning diagnostic outputs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {screening?.patient && (
            <Link
              to={`/admin/patients/${screening.patient}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Patient
            </Link>
          )}
          <Link
            to="/admin/screenings"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            All Screenings
          </Link>
          <button
            type="button"
            onClick={loadScreeningData}
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
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Screening not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No screening session exists with ID #{id}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/admin/screenings"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Screenings
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
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

        {/* Loaded Screening View */}
        {!loading && !error && screening && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-700 border border-blue-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-lg">
                      Screening #{screening.id}
                    </span>
                    {getStatusBadge(screening.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created on {formatDate(screening.created_at)} • Logged by {screening.created_by_name || "Health Worker"}
                  </p>
                </div>
              </div>

              <div>
                {getPredictionBadge(report?.prediction || null)}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: Imaging & Analysis Output */}
              <div className="lg:col-span-2 space-y-6">
                {/* Retinal Scans Visualization Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Retinal Imagery & Deep Learning Heatmap
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        High-resolution fundus scan compared with Grad-CAM neural network feature localization.
                      </p>
                    </div>
                    {report?.confidence !== undefined && (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                        Confidence: {(report.confidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Original Fundus Scan */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600 block">
                        Original Fundus Photograph
                      </span>
                      <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {fundusUrl ? (
                          <img
                            src={fundusUrl}
                            alt="Original Fundus Scan"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4 text-xs text-slate-500">
                            <div className="w-8 h-8 mx-auto mb-1 text-slate-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg></div>
                            <p>No fundus image uploaded yet.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Grad-CAM Heatmap */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600 block">
                        Grad-CAM Attention Heatmap
                      </span>
                      <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {gradcamUrl ? (
                          <img
                            src={gradcamUrl}
                            alt="Grad-CAM Heatmap"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4 text-xs text-slate-500">
                            <div className="w-8 h-8 mx-auto mb-1 text-blue-500"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg></div>
                            <p>Heatmap generated upon AI completion.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Class Probabilities Bar Breakdown (if available) */}
                  {report?.probabilities && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Classification Probabilities
                      </span>
                      <div className="space-y-2 text-xs">
                        {Object.entries(report.probabilities).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between font-medium">
                              <span className="capitalize text-slate-700">{key}</span>
                              <span className="font-mono text-slate-900 font-bold">
                                {(Number(val) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Number(val) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Connected Referral Banner */}
                {referral && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm">
                            Linked Specialist Referral #{referral.id}
                          </p>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            {referral.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Assigned to: {referral.assigned_doctor_name || "Pending Doctor Assignment"}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/admin/referrals/${referral.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition self-start sm:self-auto"
                    >
                      <span>View Referral Details</span>
                      <span>→</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Right Column: Metadata Sidebar */}
              <div className="space-y-6">
                {/* Patient Summary Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Patient Profile
                    </h4>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>

                  <div>
                    <Link
                      to={`/admin/patients/${screening.patient}`}
                      className="font-bold text-slate-900 text-base hover:text-blue-600 transition block"
                    >
                      {patient?.full_name || screening.patient_name || `Patient #${screening.patient}`}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      ID: #{screening.patient}
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
                      </>
                    )}
                  </div>

                  <Link
                    to={`/admin/patients/${screening.patient}`}
                    className="w-full text-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition block mt-2"
                  >
                    Open Patient Record →
                  </Link>
                </div>

                {/* Session Timeline */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold uppercase tracking-wider text-slate-500">
                      Session Details
                    </h4>
                    <span className="text-lg">⏱️</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Screening ID:</span>
                    <span className="font-mono font-bold text-slate-900">
                      #{screening.id}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Health Worker:</span>
                    <span className="font-semibold text-slate-800">
                      {screening.created_by_name || "Health Worker"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Created At:</span>
                    <span className="font-mono text-slate-700">
                      {formatDate(screening.created_at)}
                    </span>
                  </div>

                  {report && (
                    <div className="flex justify-between py-1 border-t border-slate-100 pt-2">
                      <span className="text-slate-400">Report ID:</span>
                      <span className="font-mono font-bold text-slate-900">
                        #{report.id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default AdminScreeningDetailPage;
