import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchAdminUsers, type AdminUser } from "../../../services/users";
import { fetchReferrals, type Referral } from "../../../services/referrals";

function AdminDoctorsPage() {
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A194E] tracking-tight">
            Specialist Doctors Directory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage ophthalmologist profiles, availability, and monitor clinical referral review workloads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/referrals/assign"
            className="inline-flex items-center gap-2 rounded-xl bg-[#354DAB] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-[#2A3E8C] transition active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Assign Referrals</span>
          </Link>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
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
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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
                <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
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
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
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
    </div>
  );
}

export default AdminDoctorsPage;
