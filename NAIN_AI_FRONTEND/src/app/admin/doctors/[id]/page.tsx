import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAdminUserById,
  type AdminUser,
} from "../../../../services/users";
import {
  fetchReferrals,
  type Referral,
} from "../../../../services/referrals";

function AdminDoctorDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [doctor, setDoctor] = useState<AdminUser | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const loadDoctorData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const [doctorData, referralsData] = await Promise.all([
        fetchAdminUserById(id),
        fetchReferrals({ doctor_id: id }).catch(() => []),
      ]);

      if (doctorData.role.toUpperCase() !== "DOCTOR") {
        // Not a doctor account
        setDoctor(doctorData);
      } else {
        setDoctor(doctorData);
      }

      setReferrals(referralsData);
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
        setError("Failed to load doctor profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDoctorData();
  }, [loadDoctorData]);

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

  // Workload breakdown
  const workloadStats = useMemo(() => {
    const totalAssigned = referrals.length;
    const pendingReview = referrals.filter((r) => r.status === "ASSIGNED").length;
    const reviewed = referrals.filter((r) => r.status === "REVIEWED").length;
    const collected = referrals.filter((r) => r.status === "COLLECTED").length;

    return { totalAssigned, pendingReview, reviewed, collected };
  }, [referrals]);

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Collected
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Reviewed
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Pending Doctor Review
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Pending
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

  const displayName = doctor
    ? doctor.full_name ||
      `${doctor.first_name || ""} ${doctor.last_name || ""}`.trim() ||
      doctor.username
    : "";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              Specialist Profile
            </span>
            <span className="text-xs text-slate-400 font-mono">Dr. {displayName || `ID #${id}`}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Doctor Profile & Workload
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Specialist credentials, active assigned referrals, and completed clinical evaluations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/doctors"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Doctors
          </Link>
          <button
            type="button"
            onClick={loadDoctorData}
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
          <div className="space-y-6 animate-pulse">
            <div className="h-32 rounded-2xl bg-white border border-slate-200 p-6"></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white border border-slate-200"
                ></div>
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-white border border-slate-200"></div>
          </div>
        )}

        {/* Not Found */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Doctor not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No specialist user was found with ID #{id}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/admin/doctors"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Doctors
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load doctor profile
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadDoctorData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded Profile View */}
        {!loading && !error && doctor && (
          <div className="space-y-6">
            {/* Doctor Profile Banner Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-3xl font-bold text-indigo-700 border border-indigo-100">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">
                        Dr. {displayName}
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                        Ophthalmologist Specialist
                      </span>
                      {doctor.is_active ? (
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
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Username: @{doctor.username} • User ID: #{doctor.id} • Joined: {formatDate(doctor.date_joined)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1 text-xs text-slate-600">
                  {doctor.email && (
                    <p className="font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <span className="flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg> {doctor.email}</span>
                    </p>
                  )}
                  <p className="text-slate-400 mt-1">
                    System Role: <span className="font-semibold text-slate-700">{doctor.role}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Workload Statistics Cards */}
            <section aria-label="Doctor Workload Breakdown">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* Total Assigned */}
                <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Total Assigned
                    </span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-blue-700">
                      {workloadStats.totalAssigned}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Lifetime assigned cases
                    </p>
                  </div>
                </div>

                {/* Pending Review */}
                <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Pending Review
                    </span>
                    <span className="text-lg">⏳</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-amber-700">
                      {workloadStats.pendingReview}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Awaiting evaluation
                    </p>
                  </div>
                </div>

                {/* Reviewed */}
                <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Reviewed
                    </span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-emerald-700">
                      {workloadStats.reviewed}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ready for collection
                    </p>
                  </div>
                </div>

                {/* Collected */}
                <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                      Collected
                    </span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-purple-700">
                      {workloadStats.collected}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Finalized cases
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Assigned Referrals Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assigned Clinical Cases ({referrals.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Referral cases assigned to Dr. {displayName} for diagnosis and treatment recommendations.
                  </p>
                </div>
              </div>

              {referrals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-400">
                  No referral cases are currently assigned to this doctor.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Referral ID</th>
                        <th className="py-3 px-4">Patient</th>
                        <th className="py-3 px-4">AI Prediction</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Assigned / Created</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {referrals.map((ref) => (
                        <tr
                          key={ref.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{ref.id}
                          </td>
                          <td className="py-3.5 px-4">
                            {ref.patient_id ? (
                              <Link
                                to={`/admin/patients/${ref.patient_id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1"
                              >
                                <span>{ref.patient_name || `Patient #${ref.patient_id}`}</span>
                                <span className="text-[10px] text-blue-500">↗</span>
                              </Link>
                            ) : (
                              <span className="font-semibold text-slate-900">
                                {ref.patient_name || "—"}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {getPredictionBadge(ref.prediction)}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(ref.status)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {formatDate(ref.created_at)}
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

export default AdminDoctorDetailPage;
