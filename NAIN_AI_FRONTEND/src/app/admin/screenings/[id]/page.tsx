import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

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
              to="/admin/screenings"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Screenings
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
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/admin/screenings" className="hover:text-blue-600 transition">
            Screening Management
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Screening #{id}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Screening Session #{id}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Session timeline, fundus camera scans, and Deep Learning diagnostic outputs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {screening?.patient && (
              <Link
                to={`/admin/patients/${screening.patient}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                ← Back to Patient
              </Link>
            )}
            <Link
              to="/admin/screenings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← All Screenings
            </Link>
            <button
              type="button"
              onClick={loadScreeningData}
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
              👁️
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
                  👁️
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
                            <p className="text-lg mb-1">📷</p>
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
                            <p className="text-lg mb-1">🧠</p>
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
                      <span className="text-2xl">📋</span>
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
                    <span className="text-lg">👤</span>
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
      </main>
    </div>
  );
}

export default AdminScreeningDetailPage;
