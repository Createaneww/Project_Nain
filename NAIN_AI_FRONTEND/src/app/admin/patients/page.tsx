import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchPatients, type Patient } from "../../../services/patients";
import { fetchScreenings, type Screening } from "../../../services/screenings";

function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [patientsData, screeningsData] = await Promise.all([
        fetchPatients(),
        fetchScreenings().catch(() => []),
      ]);

      setPatients(patientsData);
      setScreenings(screeningsData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load patients list. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Map patient ID to screening count
  const screeningCountMap = useMemo(() => {
    const map = new Map<number, number>();
    screenings.forEach((sc) => {
      if (sc.patient) {
        map.set(sc.patient, (map.get(sc.patient) || 0) + 1);
      }
    });
    return map;
  }, [screenings]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const total = patients.length;
    const male = patients.filter((p) => (p.gender || "").toUpperCase() === "MALE").length;
    const female = patients.filter((p) => (p.gender || "").toUpperCase() === "FEMALE").length;
    const other = patients.filter((p) => {
      const g = (p.gender || "").toUpperCase();
      return g !== "MALE" && g !== "FEMALE";
    }).length;

    return { total, male, female, other };
  }, [patients]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.phone_number || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        String(p.id).includes(q);

      const matchesGender =
        genderFilter === "ALL" ||
        (p.gender || "").toUpperCase() === genderFilter.toUpperCase();

      return matchesSearch && matchesGender;
    });
  }, [patients, searchQuery, genderFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A194E] tracking-tight">
            Patient Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete database of patients, medical identifiers, and screening history across all healthcare centers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-[0.98] disabled:opacity-60"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

        {/* Error Alert */}
        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <div>
                <p className="font-semibold text-red-900">
                  Unable to load patients registry
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <section aria-label="Patient Statistics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Total Patients */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Patients
                </span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  {summaryCounts.total}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Registered profiles
                </p>
              </div>
            </div>

            {/* Male Patients */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Male Patients
                </span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.male}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Male demographic
                </p>
              </div>
            </div>

            {/* Female Patients */}
            <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                  Female Patients
                </span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-rose-700">
                  {summaryCounts.female}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Female demographic
                </p>
              </div>
            </div>

            {/* Total Screenings */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Total Screenings
                </span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {screenings.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Lifetime screening scans
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, phone, email, or ID..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Gender Filter */}
            <div className="w-full sm:w-56">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Genders ({patients.length})</option>
                <option value="MALE">Male ({summaryCounts.male})</option>
                <option value="FEMALE">Female ({summaryCounts.female})</option>
                {summaryCounts.other > 0 && (
                  <option value="OTHER">Other ({summaryCounts.other})</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                <span>Loading patients registry...</span>
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-50 border border-slate-100 animate-pulse"
                ></div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredPatients.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No patients found
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || genderFilter !== "ALL"
                  ? "No patients match your search query or filter. Try clearing filters."
                  : "No patient records registered in the system yet."}
              </p>
              {(searchQuery || genderFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setGenderFilter("ALL");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && filteredPatients.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Patient ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Patient Name</th>
                    <th className="py-3.5 px-4 sm:px-6">Age</th>
                    <th className="py-3.5 px-4 sm:px-6">Gender</th>
                    <th className="py-3.5 px-4 sm:px-6">Created Date</th>
                    <th className="py-3.5 px-4 sm:px-6">Total Screenings</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPatients.map((p) => {
                    const totalSc = screeningCountMap.get(p.id) || 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Patient ID */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                          #{p.id}
                        </td>

                        {/* Patient Name */}
                        <td className="py-4 px-4 sm:px-6">
                          <Link
                            to={`/admin/patients/${p.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 transition"
                          >
                            {p.full_name}
                          </Link>
                          {p.phone_number && (
                            <p className="text-xs text-slate-400 font-mono">
                              <span className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg> {p.phone_number}</span>
                            </p>
                          )}
                        </td>

                        {/* Age */}
                        <td className="py-4 px-4 sm:px-6 text-slate-700">
                          {p.age} yrs
                        </td>

                        {/* Gender */}
                        <td className="py-4 px-4 sm:px-6">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              p.gender?.toUpperCase() === "MALE"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : p.gender?.toUpperCase() === "FEMALE"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {p.gender}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
                          {formatDate(p.created_at)}
                        </td>

                        {/* Total Screenings */}
                        <td className="py-4 px-4 sm:px-6">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span>{totalSc}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <Link
                            to={`/admin/patients/${p.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
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
          )}
        </div>
    </div>
  );
}

export default AdminPatientsPage;
