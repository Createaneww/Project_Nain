import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import {
  fetchPatientById,
  fetchPatientScreenings,
  type Patient,
  type ScreeningSummary,
} from "../../../../services/patients";

function HealthWorkerPatientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

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
        if (err.message.toLowerCase().includes("not found")) {
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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header / Navigation Bar */}
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
            to="/health-worker/patients"
            className="hover:text-blue-600 transition"
          >
            Patients
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Patient Details</span>
        </nav>

        {/* Page Title & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Patient Details
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View patient information and screening activity.
            </p>
          </div>
          <Link
            to="/health-worker/patients"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            ← Back to Patients
          </Link>
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="h-16 w-16 rounded-full bg-slate-200"></div>
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-slate-200 rounded"></div>
                  <div className="h-4 w-28 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-slate-200 rounded"></div>
                    <div className="h-5 w-36 bg-slate-100 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
              <span>Loading patient details...</span>
            </div>
          </div>
        )}

        {/* Not Found Error State */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              👤
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Patient Not Found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No patient record exists with ID #{id}. The record may have been deleted or the link might be incorrect.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/health-worker/patients"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Patients List
              </Link>
            </div>
          </div>
        )}

        {/* General Error State */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-900">
                    Unable to load patient details
                  </h3>
                  <p className="mt-0.5 text-sm text-red-700">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadPatientData}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  Retry
                </button>
                <Link
                  to="/health-worker/patients"
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                >
                  Back to Patients
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Patient Details Content */}
        {!loading && !error && patient && (
          <div className="space-y-6">
            {/* Patient Hero Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-md shadow-blue-500/20">
                    {patient.full_name
                      ? patient.full_name.charAt(0).toUpperCase()
                      : "P"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                        {patient.full_name || "Unnamed Patient"}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 font-mono">
                        Patient #{patient.id}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          (patient.gender || "").toUpperCase() === "MALE"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : (patient.gender || "").toUpperCase() === "FEMALE"
                            ? "bg-pink-50 text-pink-700 border border-pink-100"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {formatGender(patient.gender)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Registered on {formatDate(patient.created_at)}
                    </p>
                  </div>
                </div>

                {/* Primary CTA in header card */}
                <Link
                  to={`/health-worker/screenings/new?patient_id=${patient.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <span>Start New Screening</span>
                  <span>→</span>
                </Link>
              </div>

              {/* Patient Information Grid */}
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                  Patient Information
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Full Name */}
                  <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500">
                      Full Name
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {patient.full_name || "—"}
                    </p>
                  </div>

                  {/* Age */}
                  <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500">Age</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {patient.age ? `${patient.age} years` : "—"}
                    </p>
                  </div>

                  {/* Gender */}
                  <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500">Gender</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatGender(patient.gender)}
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500">
                      Phone Number
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 font-mono">
                      {patient.phone_number || patient.phone || "—"}
                    </p>
                  </div>

                  {/* Email Address */}
                  <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500">
                      Email Address
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 break-all">
                      {patient.email || "—"}
                    </p>
                  </div>

                  {/* Registered Date */}
                  <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500">
                      Registered Date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(patient.created_at)}
                    </p>
                  </div>

                  {/* Address (Spans across cols) */}
                  <div className="sm:col-span-2 lg:col-span-3 rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500">
                      Residential Address
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {patient.address || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/health-worker/screenings/new?patient_id=${patient.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700"
                >
                  <span>Start New Screening</span>
                  <span>→</span>
                </Link>
                <Link
                  to="/health-worker/patients"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                >
                  ← Back to Patients List
                </Link>
              </div>
            </div>

            {/* Screening History Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Screening History
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Past diabetic retinopathy screenings conducted for this patient.
                  </p>
                </div>
                {screenings.length > 0 && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                    {screenings.length} Record{screenings.length === 1 ? "" : "s"}
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                          👁️
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            Screening #{sc.id}
                          </p>
                          <p className="text-xs text-slate-500">
                            Created on {formatDate(sc.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            sc.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : sc.status === "PROCESSING"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : sc.status === "FAILED"
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {sc.status || "CREATED"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    📋
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Patient screening history will appear here.
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    No screenings have been conducted for this patient yet. You can start a new screening below.
                  </p>
                  <Link
                    to={`/health-worker/screenings/new?patient_id=${patient.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
                  >
                    + Conduct First Screening
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default HealthWorkerPatientDetailPage;
