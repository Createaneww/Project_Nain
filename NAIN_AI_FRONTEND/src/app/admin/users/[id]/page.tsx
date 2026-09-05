import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchAdminUserById,
  updateAdminUser,
  resetAdminUserPassword,
  toggleAdminUserActive,
  type AdminUser,
} from "../../../../services/users";
import {
  fetchReferrals,
  type Referral,
} from "../../../../services/referrals";
import {
  fetchScreenings,
  type Screening,
} from "../../../../services/screenings";

function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    full_name: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
  }>({ full_name: "", username: "", email: "", role: "DOCTOR", is_active: true });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset Password Modal state
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Deactivate Modal state
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState<boolean>(false);
  const [isProcessingDeactivate, setIsProcessingDeactivate] = useState<boolean>(false);

  // Success Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const [userData, allReferrals, allScreenings] = await Promise.all([
        fetchAdminUserById(id),
        fetchReferrals().catch(() => []),
        fetchScreenings().catch(() => []),
      ]);

      setUser(userData);
      setReferrals(allReferrals);
      setScreenings(allScreenings);
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
        setError("Unable to load user details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

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

  // Doctor Workload stats & cases
  const doctorCases = useMemo(() => {
    if (!user || user.role !== "DOCTOR") return [];
    return referrals.filter((r) => r.assigned_doctor === user.id);
  }, [user, referrals]);

  const doctorStats = useMemo(() => {
    const totalAssigned = doctorCases.length;
    const pendingReviews = doctorCases.filter((r) => r.status === "ASSIGNED").length;
    const completedReviews = doctorCases.filter(
      (r) => r.status === "REVIEWED" || r.status === "COLLECTED"
    ).length;
    return { totalAssigned, pendingReviews, completedReviews };
  }, [doctorCases]);

  // Health Worker stats & screenings
  const healthWorkerScreenings = useMemo(() => {
    if (!user || user.role !== "HEALTH_WORKER") return [];
    return screenings.filter(
      (s) => s.created_by_name?.toLowerCase() === user.username.toLowerCase() ||
             s.created_by_name?.toLowerCase() === user.full_name?.toLowerCase()
    );
  }, [user, screenings]);

  const healthWorkerCollectionsCount = useMemo(() => {
    if (!user || user.role !== "HEALTH_WORKER") return 0;
    return referrals.filter(
      (r) => r.status === "COLLECTED" && r.collected_by === user.id
    ).length;
  }, [user, referrals]);

  // Role badge styling
  const getRoleBadge = (role?: string) => {
    const r = (role || "").toUpperCase();
    switch (r) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Administrator
          </span>
        );
      case "DOCTOR":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            Doctor (Specialist)
          </span>
        );
      case "HEALTH_WORKER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Health Worker
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            {r}
          </span>
        );
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (!user) return;
    setEditFormData({
      full_name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username,
      username: user.username,
      email: user.email || "",
      role: user.role,
      is_active: user.is_active,
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const updated = await updateAdminUser(user.id, {
        full_name: editFormData.full_name.trim(),
        username: editFormData.username.trim(),
        email: editFormData.email.trim(),
        role: editFormData.role,
        is_active: editFormData.is_active,
      });

      setUser(updated);
      setIsEditModalOpen(false);
      setSuccessToast("User profile updated successfully.");
    } catch (err) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("Failed to update user profile.");
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPasswordError(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await resetAdminUserPassword(user.id, newPassword);
      setIsResetPasswordOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessToast(`Password for @${user.username} has been reset successfully.`);
    } catch (err) {
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError("Failed to reset password.");
      }
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Toggle Active Execution
  const handleToggleActive = async (newStatus: boolean) => {
    if (!user) return;
    setIsProcessingDeactivate(true);
    setError(null);

    try {
      const updated = await toggleAdminUserActive(user.id, newStatus);
      setUser(updated);
      setIsDeactivateModalOpen(false);
      setSuccessToast(`User status updated to ${newStatus ? "Active" : "Inactive"}.`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update user status.");
      }
    } finally {
      setIsProcessingDeactivate(false);
    }
  };

  const displayName =
    user?.full_name ||
    (user?.first_name || user?.last_name
      ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
      : user?.username);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              Account Control
            </span>
            <span className="text-xs text-slate-400 font-mono">User #{id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            User Profile & Controls
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Account credentials, authorization role, activity statistics, and security permissions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Users
          </Link>
          <button
            type="button"
            onClick={loadUserData}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#354DAB] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-[#2A3E8C] transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

        {/* Success Toast */}
        {successToast && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-semibold text-emerald-900">Success</p>
                <p className="text-xs text-emerald-700 mt-0.5">{successToast}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-bold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <div>
                <p className="font-semibold text-red-900">Alert</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 font-bold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-32 rounded-2xl bg-white border border-slate-200 p-6"></div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200"></div>
              ))}
            </div>
          </div>
        )}

        {/* Not Found State */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              User not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No user account exists with ID #{id}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/admin/users"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Users
              </Link>
            </div>
          </div>
        )}

        {/* Loaded User View */}
        {!loading && !isNotFound && user && (
          <div className="space-y-6">
            {/* Overview Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-3xl font-bold text-indigo-700 border border-indigo-100">
                    {user.role === "DOCTOR" ? (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>) : user.role === "HEALTH_WORKER" ? (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>) : (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">
                        {displayName}
                      </h2>
                      {getRoleBadge(user.role)}
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      @{user.username} • User ID: #{user.id} • Registered: {formatDate(user.date_joined)}
                    </p>
                  </div>
                </div>

                {/* Account Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setPasswordError(null);
                      setIsResetPasswordOpen(true);
                    }}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 shadow-sm hover:bg-amber-100 transition"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (user.is_active) {
                        setIsDeactivateModalOpen(true);
                      } else {
                        handleToggleActive(true);
                      }
                    }}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition border ${
                      user.is_active
                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {user.is_active ? "Deactivate Account" : "Activate Account"}
                  </button>
                </div>
              </div>

              {/* Information Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Email Address</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 text-sm block">
                    {user.email || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Specialization</span>
                  <span className="font-bold text-slate-900 mt-1 text-sm block">
                    {user.role === "DOCTOR" ? (user.specialization || "Ophthalmologist") : "— Non-specialist"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Account Created</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 text-sm block">
                    {formatDate(user.date_joined)}
                  </span>
                </div>
              </div>
            </div>

            {/* DOCTOR SPECIFIC STATS & ASSIGNED REFERRALS */}
            {user.role === "DOCTOR" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Total Assigned Cases
                    </span>
                    <p className="text-2xl font-bold text-blue-700 mt-2">
                      {doctorStats.totalAssigned}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Pending Reviews
                    </span>
                    <p className="text-2xl font-bold text-amber-700 mt-2">
                      {doctorStats.pendingReviews}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Completed Reviews
                    </span>
                    <p className="text-2xl font-bold text-emerald-700 mt-2">
                      {doctorStats.completedReviews}
                    </p>
                  </div>
                </div>

                {/* Assigned Referrals Table */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                    Assigned Referral Cases ({doctorCases.length})
                  </h3>

                  {doctorCases.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No referral cases are currently assigned to this doctor.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                            <th className="py-2.5 px-3">Referral ID</th>
                            <th className="py-2.5 px-3">Patient</th>
                            <th className="py-2.5 px-3">AI Prediction</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Created</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {doctorCases.map((ref) => (
                            <tr key={ref.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                #{ref.id}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {ref.patient_name || `Patient #${ref.patient_id}`}
                              </td>
                              <td className="py-3 px-3 font-semibold text-blue-700">
                                {ref.prediction}
                              </td>
                              <td className="py-3 px-3">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                  {ref.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-500">
                                {formatDate(ref.created_at)}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <Link
                                  to={`/admin/referrals/${ref.id}`}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  View →
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

            {/* HEALTH WORKER SPECIFIC STATS */}
            {user.role === "HEALTH_WORKER" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Screenings Created
                    </span>
                    <p className="text-2xl font-bold text-blue-700 mt-2">
                      {healthWorkerScreenings.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm">
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                      Referrals Collected
                    </span>
                    <p className="text-2xl font-bold text-purple-700 mt-2">
                      {healthWorkerCollectionsCount}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* EDIT MODAL */}
      {isEditModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#354DAB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <h3 className="text-base font-bold text-slate-900">
                  Edit User Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {editError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Username
                </label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        role: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ADMIN">Administrator</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="HEALTH_WORKER">Health Worker</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={editFormData.is_active ? "ACTIVE" : "INACTIVE"}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        is_active: e.target.value === "ACTIVE",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmittingEdit}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetPasswordOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reset User Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set a new password for @{user.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPasswordOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {passwordError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  disabled={isSubmittingPassword}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isSubmittingPassword ? "Resetting..." : "Confirm Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE MODAL */}
      {isDeactivateModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 text-xl font-bold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Deactivate Account
                </h3>
                <p className="text-xs text-slate-500">
                  Suspend user access
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to deactivate{" "}
              <span className="font-bold text-slate-900">@{user.username}</span>?
              This user will immediately be blocked from logging into the platform.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeactivateModalOpen(false)}
                disabled={isProcessingDeactivate}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(false)}
                disabled={isProcessingDeactivate}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {isProcessingDeactivate ? "Deactivating..." : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserDetailPage;
