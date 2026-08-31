import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleAdminUserActive,
  resetAdminUserPassword,
  type AdminUser,
} from "../../../services/users";

interface AddUserFormData {
  full_name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "ADMIN" | "DOCTOR" | "HEALTH_WORKER";
  specialization: string;
}

const initialAddForm: AddUserFormData = {
  full_name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "DOCTOR",
  specialization: "Ophthalmologist",
};

function AdminUsersPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addFormData, setAddFormData] = useState<AddUserFormData>(initialAddForm);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Modal state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
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
  const [passwordResetUser, setPasswordResetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Deactivate Confirmation Modal state
  const [deactivateConfirmUser, setDeactivateConfirmUser] = useState<AdminUser | null>(null);
  const [isProcessingDeactivate, setIsProcessingDeactivate] = useState<boolean>(false);

  // Feedback Toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load user accounts. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  // Summary counts computed from real users (6 cards)
  const summaryCounts = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "ADMIN").length;
    const doctors = users.filter((u) => u.role === "DOCTOR").length;
    const healthWorkers = users.filter((u) => u.role === "HEALTH_WORKER").length;
    const activeUsers = users.filter((u) => u.is_active).length;
    const inactiveUsers = users.filter((u) => !u.is_active).length;

    return { total, admins, doctors, healthWorkers, activeUsers, inactiveUsers };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.first_name || "").toLowerCase().includes(q) ||
        (u.last_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        String(u.id).includes(q);

      const matchesRole =
        roleFilter === "ALL" ||
        u.role.toUpperCase() === roleFilter.toUpperCase();

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.is_active) ||
        (statusFilter === "INACTIVE" && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Role badge styling
  const getRoleBadge = (role?: string) => {
    const r = (role || "").toUpperCase();
    switch (r) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Administrator
          </span>
        );
      case "DOCTOR":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            Doctor
          </span>
        );
      case "HEALTH_WORKER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Health Worker
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            {r}
          </span>
        );
    }
  };

  // Specialization helper
  const getSpecialization = (u: AdminUser): string => {
    if (u.role === "DOCTOR") {
      return u.specialization || "Ophthalmologist";
    }
    return "—";
  };

  // Handle Add User Submission
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (addFormData.password !== addFormData.confirmPassword) {
      setAddError("Passwords do not match. Please re-enter.");
      return;
    }

    if (addFormData.password.length < 6) {
      setAddError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmittingAdd(true);

    try {
      const newUser = await createAdminUser({
        username: addFormData.username.trim(),
        email: addFormData.email.trim(),
        password: addFormData.password,
        role: addFormData.role,
        full_name: addFormData.full_name.trim(),
        is_active: true,
      });

      setUsers((prev) => [...prev, newUser]);
      setIsAddModalOpen(false);
      setAddFormData(initialAddForm);
      setSuccessToast(`User @${newUser.username} created successfully.`);
    } catch (err) {
      if (err instanceof Error) {
        setAddError(err.message);
      } else {
        setAddError("Failed to create user. Please check your inputs.");
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit User Modal
  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditFormData({
      full_name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username,
      username: user.username,
      email: user.email || "",
      role: user.role,
      is_active: user.is_active,
    });
    setEditError(null);
  };

  // Handle Edit User Submission
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const updated = await updateAdminUser(editingUser.id, {
        full_name: editFormData.full_name.trim(),
        username: editFormData.username.trim(),
        email: editFormData.email.trim(),
        role: editFormData.role,
        is_active: editFormData.is_active,
      });

      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      setSuccessToast(`User @${updated.username} updated successfully.`);
    } catch (err) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("Failed to update user. Please check your inputs.");
      }
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (user: AdminUser) => {
    setPasswordResetUser(user);
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordError(null);
  };

  // Handle Reset Password Submission
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser) return;
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
      await resetAdminUserPassword(passwordResetUser.id, newPassword);
      setPasswordResetUser(null);
      setSuccessToast(`Password for @${passwordResetUser.username} has been reset successfully.`);
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

  // Prompt Activate / Deactivate Toggle
  const promptToggleActive = (user: AdminUser) => {
    if (user.is_active) {
      // Safety check 1: Prevent self-deactivation
      if (storedUser && storedUser.username === user.username) {
        setError("You cannot deactivate your own logged-in Administrator account.");
        return;
      }
      // Safety check 2: Prevent deactivating last active admin
      if (user.role === "ADMIN" && summaryCounts.admins <= 1) {
        setError("Cannot deactivate the last active Administrator account.");
        return;
      }
      setDeactivateConfirmUser(user);
    } else {
      // Direct activation
      executeToggleActive(user, true);
    }
  };

  // Execute Toggle Active
  const executeToggleActive = async (user: AdminUser, newStatus: boolean) => {
    setIsProcessingDeactivate(true);
    setError(null);

    try {
      const updated = await toggleAdminUserActive(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setDeactivateConfirmUser(null);
      setSuccessToast(`Account @${user.username} is now ${newStatus ? "Active" : "Inactive"}.`);
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
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Users Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Users Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage system users, roles, account access, and staff status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAddFormData(initialAddForm);
                setAddError(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-purple-500/20 hover:bg-purple-700 transition"
            >
              <span>+ Add User</span>
            </button>
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              🔄 Refresh
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
              <span className="text-xl">✅</span>
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
              ✕
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold text-red-900">Action Alert</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. TOP SUMMARY CARDS (6 Cards) */}
        <section aria-label="User Statistics">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {/* Total Users */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Users
                </span>
                <span className="text-lg">👥</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  {summaryCounts.total}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All system accounts
                </p>
              </div>
            </div>

            {/* Administrators */}
            <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                  Administrators
                </span>
                <span className="text-lg">🛡️</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-purple-700">
                  {summaryCounts.admins}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  System admins
                </p>
              </div>
            </div>

            {/* Doctors */}
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  Doctors
                </span>
                <span className="text-lg">🩺</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-indigo-700">
                  {summaryCounts.doctors}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ophthalmologists
                </p>
              </div>
            </div>

            {/* Health Workers */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Health Workers
                </span>
                <span className="text-lg">🏥</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.healthWorkers}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Field screeners
                </p>
              </div>
            </div>

            {/* Active Users */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Active Users
                </span>
                <span className="text-lg">🟢</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.activeUsers}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Login enabled
                </p>
              </div>
            </div>

            {/* Inactive Users */}
            <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                  Inactive Users
                </span>
                <span className="text-lg">⛔</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-rose-700">
                  {summaryCounts.inactiveUsers}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Access suspended
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SEARCH & FILTER CONTROLS */}
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
                placeholder="Search by name, username, email, or user ID..."
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

            {/* Role Filter */}
            <div className="w-full sm:w-56">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Roles ({users.length})</option>
                <option value="ADMIN">Administrator ({summaryCounts.admins})</option>
                <option value="DOCTOR">Doctor ({summaryCounts.doctors})</option>
                <option value="HEALTH_WORKER">
                  Health Worker ({summaryCounts.healthWorkers})
                </option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-56">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Statuses ({users.length})</option>
                <option value="ACTIVE">Active ({summaryCounts.activeUsers})</option>
                <option value="INACTIVE">Inactive ({summaryCounts.inactiveUsers})</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. USERS TABLE */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading Skeleton */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading users...</span>
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
          {!loading && filteredUsers.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                👥
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No users found
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL"
                  ? "No user accounts match your search or filter criteria. Try resetting filters."
                  : "No user accounts registered in the database."}
              </p>
              {(searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("ALL");
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
          {!loading && filteredUsers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">User ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Name / Username</th>
                    <th className="py-3.5 px-4 sm:px-6">Email</th>
                    <th className="py-3.5 px-4 sm:px-6">Role</th>
                    <th className="py-3.5 px-4 sm:px-6">Specialization</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6">Created Date</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.map((u) => {
                    const displayName =
                      u.full_name ||
                      (u.first_name || u.last_name
                        ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                        : u.username);

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* User ID */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                          #{u.id}
                        </td>

                        {/* Name & Username */}
                        <td className="py-4 px-4 sm:px-6">
                          <div>
                            <Link
                              to={`/admin/users/${u.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition"
                            >
                              {displayName}
                            </Link>
                            <p className="text-xs text-slate-400 font-mono">
                              @{u.username}
                            </p>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-600 font-mono">
                          {u.email || <span className="text-slate-400 italic">No email</span>}
                        </td>

                        {/* Role */}
                        <td className="py-4 px-4 sm:px-6">
                          {getRoleBadge(u.role)}
                        </td>

                        {/* Specialization */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-700">
                          {getSpecialization(u)}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 sm:px-6">
                          {u.is_active ? (
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
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
                          {formatDate(u.date_joined)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <Link
                              to={`/admin/users/${u.id}`}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              View →
                            </Link>

                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => promptToggleActive(u)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition border ${
                                u.is_active
                                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
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

      {/* ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-xl font-bold">
                  ➕
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Register New User
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create a new system user account with secure credentials.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormData.full_name}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        full_name: e.target.value,
                      }))
                    }
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={addFormData.username}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="e.g. rajesh_sharma"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) =>
                    setAddFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="e.g. rajesh@nain.ai"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>

              {/* Role & Specialization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    System Role *
                  </label>
                  <select
                    value={addFormData.role}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        role: e.target.value as "ADMIN" | "DOCTOR" | "HEALTH_WORKER",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="HEALTH_WORKER">Health Worker</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                {addFormData.role === "DOCTOR" ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Specialization *
                    </label>
                    <select
                      value={addFormData.specialization}
                      onChange={(e) =>
                        setAddFormData((prev) => ({
                          ...prev,
                          specialization: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    >
                      <option value="Ophthalmologist">Ophthalmologist</option>
                      <option value="Retina Specialist">Retina Specialist</option>
                      <option value="General Eye Surgeon">General Eye Surgeon</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400">
                      Specialization
                    </label>
                    <input
                      type="text"
                      disabled
                      value="— Not applicable"
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={addFormData.password}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Min 6 characters"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={addFormData.confirmPassword}
                    onChange={(e) =>
                      setAddFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingAdd}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isSubmittingAdd ? (
                    <>
                      <span className="animate-spin text-xs">🌀</span>
                      <span>Creating User...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✏️</span>
                <h3 className="text-base font-bold text-slate-900">
                  Edit User @{editingUser.username}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-3.5">
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

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const u = editingUser;
                    setEditingUser(null);
                    openResetPasswordModal(u);
                  }}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
                >
                  Reset Password 🔑
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
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
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔑</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reset User Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    For @{passwordResetUser.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
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
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
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

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {deactivateConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Deactivate User Account
                </h3>
                <p className="text-xs text-slate-500">
                  Suspend system login access
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Are you sure you want to deactivate{" "}
              <span className="font-bold text-slate-900">
                @{deactivateConfirmUser.username}
              </span>{" "}
              ({deactivateConfirmUser.full_name || deactivateConfirmUser.role})?
              This user will immediately be blocked from logging into the platform.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateConfirmUser(null)}
                disabled={isProcessingDeactivate}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeToggleActive(deactivateConfirmUser, false)}
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

export default AdminUsersPage;
