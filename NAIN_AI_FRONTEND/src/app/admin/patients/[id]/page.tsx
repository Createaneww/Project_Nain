import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchPatientById,
  type Patient,
} from "../../../../services/patients";
import {
  fetchScreenings,
  type Screening,
} from "../../../../services/screenings";
import {
  fetchReferrals,
  type Referral,
} from "../../../../services/referrals";
import {
  fetchReports,
  type Report,
} from "../../../../services/reports";

function AdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const loadPatientData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const [patientData, screeningsData, referralsData, reportsData] =
        await Promise.all([
          fetchPatientById(id),
          fetchScreenings({ patient_id: id }).catch(() => []),
          fetchReferrals({ patient_id: id }).catch(() => []),
          fetchReports().catch(() => []),
        ]);

      setPatient(patientData);
      setScreenings(screeningsData);
      setReferrals(referralsData);
      setReports(reportsData);
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
        setError("Unable to load patient profile data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

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
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            {s === "COMPLETED" ? "Completed" : "Reviewed"}
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Processing
          </span>
        );
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Collected
          </span>
        );
      case "IMAGE_UPLOADED":
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            {s === "IMAGE_UPLOADED" ? "Image Uploaded" : "Assigned"}
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
            Failed
          </span>
        );
      case "CREATED":
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            {s === "CREATED" ? "Initiated" : "Pending"}
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

  // Find report for a screening
  const getReportForScreening = (screeningId: number) => {
    return reports.find((r) => r.screening_id === screeningId);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              Patient Record
            </span>
            <span className="text-xs text-slate-400 font-mono">ID #{id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Patient Profile & History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Clinical screening records, longitudinal history, and diagnostic referral tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/patients"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Patients
          </Link>
          <button
            type="button"
            onClick={loadPatientData}
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
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-pulse space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-64 bg-slate-100 rounded"></div>
            <div className="h-40 bg-slate-100 rounded-xl"></div>
          </div>
        )}

        {/* Not Found */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Patient record not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No patient profile exists with ID #{id}.
            </p>
            <div className="mt-6">
              <Link
                to="/admin/patients"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Patients Registry
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load patient data
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadPatientData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded Patient Profile */}
        {!loading && !error && patient && (
          <div className="space-y-6">
            {/* 1. BASIC INFORMATION CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-700 border border-blue-100">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {patient.full_name}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Patient ID: #{patient.id} • Registered {formatDate(patient.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      patient.gender?.toUpperCase() === "MALE"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : patient.gender?.toUpperCase() === "FEMALE"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {patient.gender}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 border border-slate-200">
                    {patient.age} years old
                  </span>
                </div>
              </div>

              {/* Patient Attributes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Phone Number</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 text-sm block">
                    {patient.phone_number || patient.phone || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Email Address</span>
                  <span className="font-bold text-slate-900 mt-1 text-sm block">
                    {patient.email || "No email on file"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Residential Address</span>
                  <span className="font-bold text-slate-900 mt-1 text-sm block">
                    {patient.address || "No address recorded"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SCREENING HISTORY */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Screening History ({screenings.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Retinal photographic scans and AI diagnostic analyses.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                  Lifetime Scans: {screenings.length}
                </span>
              </div>

              {screenings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400">
                  No screening sessions recorded for this patient yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Screening ID</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">AI Prediction</th>
                        <th className="py-3 px-4">Screened By</th>
                        <th className="py-3 px-4 text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {screenings.map((sc) => {
                        const report = getReportForScreening(sc.id);

                        return (
                          <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              #{sc.id}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              {formatDate(sc.created_at)}
                            </td>
                            <td className="py-3.5 px-4">{getStatusBadge(sc.status)}</td>
                            <td className="py-3.5 px-4">
                              {report ? (
                                getPredictionBadge(report.prediction)
                              ) : (
                                <span className="text-slate-400 italic">No report</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {sc.created_by_name || "Health Worker"}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <Link
                                to={`/admin/screenings/${sc.id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100 hover:bg-blue-100 transition"
                              >
                                <span>View Details</span>
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

            {/* 3. REFERRAL HISTORY */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Specialist Referral History ({referrals.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ophthalmologist evaluation and collection tracking.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                  Total Referrals: {referrals.length}
                </span>
              </div>

              {referrals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400">
                  No specialist referrals created for this patient.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Referral ID</th>
                        <th className="py-3 px-4">AI Prediction</th>
                        <th className="py-3 px-4">Referral Status</th>
                        <th className="py-3 px-4">Assigned Doctor</th>
                        <th className="py-3 px-4">Doctor Notes</th>
                        <th className="py-3 px-4 text-right">Referral Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {referrals.map((ref) => (
                        <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{ref.id}
                          </td>
                          <td className="py-3.5 px-4">{getPredictionBadge(ref.prediction)}</td>
                          <td className="py-3.5 px-4">{getStatusBadge(ref.status)}</td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {ref.assigned_doctor_name ? (
                              <span className="font-semibold text-indigo-700">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg> {ref.assigned_doctor_name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                            {ref.doctor_notes || <span className="text-slate-400 italic">Pending doctor notes</span>}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              to={`/admin/referrals/${ref.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                              <span>View Referral</span>
                              <span>→</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

export default AdminPatientDetailPage;
