import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchPatientById,
  fetchPatientScreenings,
  type Patient,
  type ScreeningSummary,
} from "../../../../services/patients";

function HealthWorkerPatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [screenings, setScreenings] = useState<ScreeningSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const loadPatientData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const patientData = await fetchPatientById(id);
      setPatient(patientData);

      // Fetch patient's screening history if available
      try {
        const screeningsData = await fetchPatientScreenings(id);
        setScreenings(screeningsData);
      } catch {
        setScreenings([]);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes("not found") || err.message.includes("404")) {
          setIsNotFound(true);
        }
        setError(err.message);
      } else {
        setError("Failed to load patient details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  const formatGender = (gender?: string): string => {
    if (!gender) return "—";
    const g = gender.toUpperCase();
    if (g === "MALE") return "Male";
    if (g === "FEMALE") return "Female";
    if (g === "OTHER") return "Other";
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
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
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3F54DA] tracking-wider uppercase">
              Clinical Profile
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              Patient Record #{id}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            Patient Details
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View patient information, clinical demographics, and past screening history.
          </p>
        </div>

        <Link
          to="/health-worker/patients"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Patients</span>
        </Link>
      </div>

      {/* Loading State Skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm animate-pulse">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="h-16 w-16 rounded-2xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-slate-200 rounded" />
                <div className="h-4 w-28 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Not Found Error State */}
      {!loading && isNotFound && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Patient Not Found
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            No patient record exists with ID #{id}. The record may have been removed.
          </p>
          <div className="mt-6">
            <Link
              to="/health-worker/patients"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <span>Return to Patients Directory</span>
            </Link>
          </div>
        </div>
      )}

      {/* General Error State */}
      {!loading && !isNotFound && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-800 shadow-sm flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Unable to load patient record</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadPatientData}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Patient Details Content */}
      {!loading && !error && patient && (
        <div className="space-y-6">
          {/* Patient Hero Profile Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1D4ED8] to-[#3F54DA] text-2xl font-bold text-white shadow-md shadow-blue-950/20">
                  {patient.full_name
                    ? patient.full_name.charAt(0).toUpperCase()
                    : "P"}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight">
                      {patient.full_name || "Unnamed Patient"}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 font-mono">
                      Patient #{patient.id}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-[#3F54DA] border border-blue-100">
                      {formatGender(patient.gender)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Registered on {formatDate(patient.created_at)}
                  </p>
                </div>
              </div>

              {/* Primary CTA */}
              <Link
                to={`/health-worker/screenings/new?patient_id=${patient.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#3F54DA] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-[#3F54DA]/20 hover:shadow-lg hover:shadow-[#3F54DA]/30 transition duration-150 active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Start New Screening</span>
              </Link>
            </div>

            {/* Patient Information Grid */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Clinical Identification & Demographics
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Full Name */}
                <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Full Name</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {patient.full_name || "—"}
                  </p>
                </div>

                {/* Age */}
                <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Age</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {patient.age ? `${patient.age} years` : "—"}
                  </p>
                </div>

                {/* Gender */}
                <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Gender</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatGender(patient.gender)}
                  </p>
                </div>

                {/* Phone */}
                <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Phone Number</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 font-mono">
                    {patient.phone_number || patient.phone || "—"}
                  </p>
                </div>

                {/* Email */}
                <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Email Address</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 truncate">
                    {patient.email || "—"}
                  </p>
                </div>

                {/* Registered Date */}
                <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Registered Date</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatDate(patient.created_at)}
                  </p>
                </div>

                {/* Address (Spans full width) */}
                <div className="sm:col-span-2 lg:col-span-3 rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Residential Address</p>
                  <p className="mt-1 text-sm text-slate-800">
                    {patient.address || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Screening History Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0F1F5C]">
                  Screening History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Past diabetic retinopathy screening sessions for this patient
                </p>
              </div>
              {screenings.length > 0 && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#3F54DA] border border-blue-100">
                  {screenings.length} {screenings.length === 1 ? "Record" : "Records"}
                </span>
              )}
            </div>

            {screenings.length > 0 ? (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
                {screenings.map((sc) => (
                  <div
                    key={sc.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#3F54DA]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          Screening #{sc.id}
                        </p>
                        <p className="text-xs text-slate-500">
                          Created on {formatDate(sc.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          sc.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : sc.status === "PROCESSING"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : sc.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {sc.status || "CREATED"}
                      </span>

                      <Link
                        to={`/health-worker/screenings/${sc.id}`}
                        className="text-xs font-bold text-[#3F54DA] hover:underline"
                      >
                        View &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#3F54DA]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  No screening sessions recorded
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No retinal screenings have been conducted for this patient yet.
                </p>
                <div className="mt-4">
                  <Link
                    to={`/health-worker/screenings/new?patient_id=${patient.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
                  >
                    <span>Start First Screening</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthWorkerPatientDetailPage;
