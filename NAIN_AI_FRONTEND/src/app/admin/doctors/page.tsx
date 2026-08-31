import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import { fetchAdminUsers, type AdminUser } from "../../../services/users";
import { fetchReferrals, type Referral } from "../../../services/referrals";

function AdminDoctorsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [doctors, setDoctors] = useState<AdminUser[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersData, referralsData] = await Promise.all([
        fetchAdminUsers({ role: "DOCTOR" }),
        fetchReferrals().catch(() => []),
      ]);

      const docUsers = usersData.filter(
        (u) => u.role.toUpperCase() === "DOCTOR"
      );
      setDoctors(docUsers);
      setReferrals(referralsData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load doctors list. Please try again.");
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

  // Doctor workload map calculation
  const doctorWorkloadMap = useMemo(() => {
    const map = new Map<
      number,
      {
        totalAssigned: number;
        pendingReview: number;
        completedReview: number;
        collected: number;
      }
    >();

    doctors.forEach((d) => {
      map.set(d.id, {
        totalAssigned: 0,
        pendingReview: 0,
        completedReview: 0,
        collected: 0,
      });
    });

    referrals.forEach((r) => {
      if (r.assigned_doctor && map.has(r.assigned_doctor)) {
        const stats = map.get(r.assigned_doctor)!;
        stats.totalAssigned += 1;
        if (r.status === "ASSIGNED") {
          stats.pendingReview += 1;
        } else if (r.status === "REVIEWED") {
          stats.completedReview += 1;
        } else if (r.status === "COLLECTED") {
          stats.collected += 1;
        }
      }
    });

    return map;
  }, [doctors, referrals]);

  // Overall system metrics
  const summaryCounts = useMemo(() => {
    const totalDoctors = doctors.length;
    const activeDoctors = doctors.filter((d) => d.is_active).length;

    let totalAssignedCases = 0;
    let pendingReviews = 0;
    let completedReviews = 0;

    referrals.forEach((r) => {
      if (r.assigned_doctor) {
        totalAssignedCases += 1;
        if (r.status === "ASSIGNED") {
          pendingReviews += 1;
        } else if (r.status === "REVIEWED") {
          completedReviews += 1;
        }
      }
    });

    return {
      totalDoctors,
      activeDoctors,
      totalAssignedCases,
      pendingReviews,
      completedReviews,
    };
  }, [doctors, referrals]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (
        d.full_name ||
        `${d.first_name || ""} ${d.last_name || ""}`.trim() ||
        d.username
      ).toLowerCase();
      const email = (d.email || "").toLowerCase();
      const username = d.username.toLowerCase();
      const idStr = String(d.id);

      const matchesSearch =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        username.includes(q) ||
        idStr.includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && d.is_active) ||
        (statusFilter === "INACTIVE" && !d.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [doctors, searchQuery, statusFilter]);

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
          <span className="text-slate-800 font-medium">Doctor Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Doctor Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage specialists and monitor clinical referral workload.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/referrals"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition"
            >
              <span>📋 Assign Referrals</span>
              <span>→</span>
            </Link>
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
                  Unable to load doctors list
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

        {/* Doctor Summary Metric Cards */}
        <section aria-label="Specialist Statistics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {/* Total Doctors */}
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Total Doctors
                </span>
                <span className="text-lg">🩺</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-indigo-700">
                  {summaryCounts.totalDoctors}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Registered specialists
                </p>
              </div>
            </div>

            {/* Active Doctors */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Active Doctors
                </span>
                <span className="text-lg">🟢</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.activeDoctors}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Available for assignment
                </p>
              </div>
            </div>

            {/* Total Assigned Cases */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Assigned Cases
                </span>
                <span className="text-lg">📁</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.totalAssignedCases}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Lifetime workload
                </p>
              </div>
            </div>

            {/* Pending Reviews */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Pending Reviews
                </span>
                <span className="text-lg">⏳</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-amber-700">
                  {summaryCounts.pendingReviews}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Awaiting review
                </p>
              </div>
            </div>

            {/* Completed Reviews */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Completed Reviews
                </span>
                <span className="text-lg">✅</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.completedReviews}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Clinically evaluated
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
                placeholder="Search by doctor name, username, email, or ID..."
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

            {/* Status Filter */}
            <div className="w-full sm:w-60">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Doctors ({doctors.length})</option>
                <option value="ACTIVE">
                  Active Only ({summaryCounts.activeDoctors})
                </option>
                <option value="INACTIVE">
                  Inactive ({doctors.length - summaryCounts.activeDoctors})
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading specialists list...</span>
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
          {!loading && filteredDoctors.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                🩺
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {searchQuery || statusFilter !== "ALL"
                  ? "No doctors match your search or filter."
                  : "No doctor accounts found."}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try resetting your search query or choosing a different filter."
                  : "Create or assign doctor roles in User Management to manage specialists."}
              </p>
              {(searchQuery || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Data Table */}
          {!loading && filteredDoctors.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Doctor ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Name / Username</th>
                    <th className="py-3.5 px-4 sm:px-6">Email</th>
                    <th className="py-3.5 px-4 sm:px-6">Specialization</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center">Assigned Cases</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center">Pending Reviews</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center">Completed Reviews</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredDoctors.map((doc) => {
                    const workload = doctorWorkloadMap.get(doc.id) || {
                      totalAssigned: 0,
                      pendingReview: 0,
                      completedReview: 0,
                      collected: 0,
                    };
                    const displayName =
                      doc.full_name ||
                      `${doc.first_name || ""} ${doc.last_name || ""}`.trim() ||
                      doc.username;

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Doctor ID */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                          #{doc.id}
                        </td>

                        {/* Name / Username */}
                        <td className="py-4 px-4 sm:px-6">
                          <div>
                            <Link
                              to={`/admin/doctors/${doc.id}`}
                              className="font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1.5"
                            >
                              <span>🩺</span>
                              <span>Dr. {displayName}</span>
                            </Link>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              @{doc.username}
                            </p>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-600">
                          {doc.email ? (
                            <span className="font-mono">{doc.email}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Specialization */}
                        <td className="py-4 px-4 sm:px-6">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                            Ophthalmologist
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 sm:px-6">
                          {doc.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Assigned Cases */}
                        <td className="py-4 px-4 sm:px-6 text-center font-bold text-slate-800">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-blue-50 text-blue-700 px-2 text-xs font-bold border border-blue-100">
                            {workload.totalAssigned}
                          </span>
                        </td>

                        {/* Pending Reviews */}
                        <td className="py-4 px-4 sm:px-6 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg px-2 text-xs font-bold border ${
                              workload.pendingReview > 0
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-500 border-slate-100"
                            }`}
                          >
                            {workload.pendingReview}
                          </span>
                        </td>

                        {/* Completed Reviews */}
                        <td className="py-4 px-4 sm:px-6 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg px-2 text-xs font-bold border ${
                              workload.completedReview > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-500 border-slate-100"
                            }`}
                          >
                            {workload.completedReview}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              to={`/admin/doctors/${doc.id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                              <span>View Profile</span>
                              <span>→</span>
                            </Link>
                          </div>
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

export default AdminDoctorsPage;
