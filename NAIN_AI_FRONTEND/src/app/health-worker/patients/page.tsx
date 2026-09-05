import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchPatients, type Patient } from "../../../services/patients";

function HealthWorkerPatientsPage() {
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

  // Client-side filtering by patient name or ID
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const query = searchTerm.trim().toLowerCase();
    return patients.filter((patient) =>
      (patient.full_name || "").toLowerCase().includes(query) ||
      String(patient.id).includes(query) ||
      (patient.phone_number || patient.phone || "").includes(query)
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
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════════
          PAGE HEADER & PRIMARY CTA
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3F54DA] tracking-wider uppercase">
              Directory Management
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              {patients.length} {patients.length === 1 ? "Patient" : "Patients"} Registered
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            Patients Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, view profiles, and initiate AI-assisted diabetic retinopathy screenings.
          </p>
        </div>

        <Link
          to="/health-worker/patients/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3F54DA] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-[#3F54DA]/20 hover:shadow-lg hover:shadow-[#3F54DA]/30 transition duration-150 active:scale-[0.98] shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Register New Patient</span>
        </Link>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ERROR ALERT
      ════════════════════════════════════════════════════════════════ */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Failed to load patients list</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadPatients}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SEARCH & TABLE SECTION
      ════════════════════════════════════════════════════════════════ */}
      <section aria-label="Patients Table" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, ID, or phone..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10 outline-none transition duration-150"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
            Showing <strong className="text-slate-800">{filteredPatients.length}</strong> of {patients.length}
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-7 h-7 animate-spin text-[#3F54DA] mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-semibold text-slate-500">Loading patients directory...</span>
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5 sm:px-6">Patient ID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Demographics</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-5 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3.5 px-5 sm:px-6 font-mono font-bold text-[#0F1F5C]">
                      #{patient.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/health-worker/patients/${patient.id}`}
                        className="font-bold text-slate-900 hover:text-[#3F54DA] transition block"
                      >
                        {patient.full_name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="font-semibold text-slate-800">{patient.age} yrs</span> &bull; {formatGender(patient.gender)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {patient.phone_number || patient.phone || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(patient.created_at)}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/health-worker/patients/${patient.id}/screening`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-[#3F54DA] border border-blue-200/80 font-bold hover:bg-[#3F54DA] hover:text-white transition duration-150"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Screen</span>
                        </Link>

                        <Link
                          to={`/health-worker/patients/${patient.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="View Patient Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {searchTerm ? "No matching patients found" : "No registered patients yet"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm
                ? `No patients match "${searchTerm}". Try adjusting your search query.`
                : "Register a new patient to begin conducting diabetic retinopathy screenings."}
            </p>
            <div className="mt-4">
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Clear Search
                </button>
              ) : (
                <Link
                  to="/health-worker/patients/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Register First Patient</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default HealthWorkerPatientsPage;
