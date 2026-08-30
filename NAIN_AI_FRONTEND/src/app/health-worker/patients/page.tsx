import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import { fetchPatients, type Patient } from "../../../services/patients";

function HealthWorkerPatientsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPatients();
      setPatients(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch patients. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Client-side filtering by patient name
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const query = searchTerm.trim().toLowerCase();
    return patients.filter((patient) =>
      (patient.full_name || "").toLowerCase().includes(query)
    );
  }, [patients, searchTerm]);

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
              to="/health-worker/dashboard"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Dashboard
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Link
                to="/health-worker/dashboard"
                className="hover:text-blue-600 transition"
              >
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Patients</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Patients
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View and manage registered patient records.
            </p>
          </div>

          <Link
            to="/health-worker/patients/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span>+ Add New Patient</span>
          </Link>
        </div>

        {/* Search Bar & Statistics Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2 px-1">
            {!loading && (
              <>
                <span>
                  Showing{" "}
                  <strong className="text-slate-800">
                    {filteredPatients.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-800">{patients.length}</strong>{" "}
                  patient{patients.length === 1 ? "" : "s"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-900">
                    Unable to load patients
                  </h3>
                  <p className="mt-0.5 text-sm text-red-700">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadPatients}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
            </div>
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-4 flex items-center justify-between animate-pulse"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-lg bg-slate-200"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-slate-200 rounded"></div>
                      <div className="h-3 w-24 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                  <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patients Table Display */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {filteredPatients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-4">
                        Patient ID
                      </th>
                      <th scope="col" className="px-6 py-4">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-4">
                        Age
                      </th>
                      <th scope="col" className="px-6 py-4">
                        Gender
                      </th>
                      <th scope="col" className="px-6 py-4">
                        Phone
                      </th>
                      <th scope="col" className="px-6 py-4">
                        Registered Date
                      </th>
                      <th scope="col" className="px-6 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {filteredPatients.map((patient) => {
                      const phoneNumber =
                        patient.phone_number || patient.phone || "—";

                      return (
                        <tr
                          key={patient.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Patient ID */}
                          <td className="px-6 py-4 font-mono text-xs font-medium text-slate-500">
                            #{patient.id}
                          </td>

                          {/* Patient Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 border border-blue-100">
                                {patient.full_name
                                  ? patient.full_name.charAt(0).toUpperCase()
                                  : "P"}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900 block">
                                  {patient.full_name || "Unnamed Patient"}
                                </span>
                                {patient.email && (
                                  <span className="text-xs text-slate-400 block">
                                    {patient.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Age */}
                          <td className="px-6 py-4 text-slate-700">
                            {patient.age ? `${patient.age} yrs` : "—"}
                          </td>

                          {/* Gender */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                (patient.gender || "").toUpperCase() === "MALE"
                                  ? "bg-blue-50 text-blue-700"
                                  : (patient.gender || "").toUpperCase() ===
                                    "FEMALE"
                                  ? "bg-pink-50 text-pink-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {formatGender(patient.gender)}
                            </span>
                          </td>

                          {/* Phone */}
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {phoneNumber}
                          </td>

                          {/* Registered Date */}
                          <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(patient.created_at)}
                          </td>

                          {/* Action */}
                          <td className="px-6 py-4 text-right">
                            <Link
                              to={`/health-worker/patients/${patient.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                              <span>View</span>
                              <span>→</span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : searchTerm ? (
              /* Empty Search Results State */
              <div className="p-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
                  🔍
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  No patients match your search
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  No registered patient found matching &ldquo;{searchTerm}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  Clear Search Filter
                </button>
              </div>
            ) : (
              /* Completely Empty Patients List State */
              <div className="p-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
                  👥
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  No patients found
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  There are no patients registered in the system yet.
                </p>
                <Link
                  to="/health-worker/patients/new"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
                >
                  + Add First Patient
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default HealthWorkerPatientsPage;
