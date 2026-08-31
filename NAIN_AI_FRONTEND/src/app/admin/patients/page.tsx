import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import { fetchPatients, type Patient } from "../../../services/patients";
import { fetchScreenings, type Screening } from "../../../services/screenings";

function AdminPatientsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Admin Dashboard"
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
              to="/admin/dashboard"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Dashboard
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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Patient Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Patient Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Complete registry of patients and screening records across healthcare clinics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              🔄 Refresh
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
              <span className="text-lg">⚠️</span>
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
                <span className="text-lg">👥</span>
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
                <span className="text-lg">👨</span>
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
                <span className="text-lg">👩</span>
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
                <span className="text-lg">👁️</span>
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
                🔍
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
                  ✕
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
                <span className="animate-spin">🌀</span>
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
                👥
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
                              📞 {p.phone_number}
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
                            <span>👁️</span>
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
      </main>
    </div>
  );
}

export default AdminPatientsPage;
