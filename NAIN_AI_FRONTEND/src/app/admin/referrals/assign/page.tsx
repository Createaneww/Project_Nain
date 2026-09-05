import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import {
  fetchReferrals,
  assignDoctorToReferral,
  type Referral,
} from "../../../../services/referrals";
import {
  fetchAdminUsers,
  type AdminUser,
} from "../../../../services/users";

interface ConfirmDialogState {
  isOpen: boolean;
  type: "single" | "bulk";
  referralIds: number[];
  patientNames: string[];
  doctorId: number;
  doctorName: string;
}

function AdminReferralsAssignPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [doctors, setDoctors] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk and single row assignment state
  const [selectedReferralIds, setSelectedReferralIds] = useState<number[]>([]);
  const [bulkDoctorId, setBulkDoctorId] = useState<number | "">("");
  const [rowDoctorMap, setRowDoctorMap] = useState<Record<number, number | "">>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    type: "single",
    referralIds: [],
    patientNames: [],
    doctorId: 0,
    doctorName: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [referralsData, usersData] = await Promise.all([
        fetchReferrals(),
        fetchAdminUsers({ role: "DOCTOR" }).catch(() => []),
      ]);

      setReferrals(referralsData);
      setDoctors(usersData.filter((u) => u.role.toUpperCase() === "DOCTOR"));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load pending referrals data. Please try again.");
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

  // Only active doctors for assignment
  const activeDoctors = useMemo(() => {
    return doctors.filter((d) => d.is_active);
  }, [doctors]);

  // Doctor workload map calculation (number of actively ASSIGNED cases)
  const doctorWorkloadMap = useMemo(() => {
    const map = new Map<number, number>();
    doctors.forEach((d) => map.set(d.id, 0));
    referrals.forEach((r) => {
      if (r.assigned_doctor && r.status === "ASSIGNED") {
        const count = map.get(r.assigned_doctor) || 0;
        map.set(r.assigned_doctor, count + 1);
      }
    });
    return map;
  }, [doctors, referrals]);

  // Pending unassigned referrals list
  const pendingReferrals = useMemo(() => {
    return referrals.filter(
      (r) => r.status === "PENDING" || !r.assigned_doctor
    );
  }, [referrals]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const pending = pendingReferrals.length;
    const availableDocs = activeDoctors.length;
    const activeCases = referrals.filter((r) => r.status === "ASSIGNED").length;
    return { pending, availableDocs, activeCases };
  }, [pendingReferrals, activeDoctors, referrals]);

  // Priority calculation based on AI prediction
  const getPriority = (prediction?: string | null) => {
    const p = (prediction || "").toUpperCase();
    if (p.includes("PROLIFERATIVE") || p.includes("SEVERE")) {
      return {
        label: "HIGH",
        className:
          "bg-rose-50 text-rose-700 border-rose-200 font-bold",
      };
    }
    if (p.includes("MODERATE")) {
      return {
        label: "MEDIUM",
        className:
          "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
      };
    }
    return {
      label: "NORMAL",
      className:
        "bg-slate-100 text-slate-700 border-slate-200 font-medium",
    };
  };

  // Prediction badge styling
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

  // Doctor display name helper
  const getDoctorName = (docId: number): string => {
    const doc = doctors.find((d) => d.id === docId);
    if (!doc) return `Doctor #${docId}`;
    return (
      doc.full_name ||
      `${doc.first_name || ""} ${doc.last_name || ""}`.trim() ||
      doc.username
    );
  };

  // Toggle row selection for bulk assignment
  const toggleSelectReferral = (id: number) => {
    setSelectedReferralIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedReferralIds.length === pendingReferrals.length) {
      setSelectedReferralIds([]);
    } else {
      setSelectedReferralIds(pendingReferrals.map((r) => r.id));
    }
  };

  // Prompt Single Assignment Modal
  const promptSingleAssign = (referral: Referral) => {
    const doctorId = rowDoctorMap[referral.id];
    if (!doctorId) return;

    setConfirmDialog({
      isOpen: true,
      type: "single",
      referralIds: [referral.id],
      patientNames: [referral.patient_name || `Patient #${referral.patient_id}`],
      doctorId: Number(doctorId),
      doctorName: getDoctorName(Number(doctorId)),
    });
  };

  // Prompt Bulk Assignment Modal
  const promptBulkAssign = () => {
    if (selectedReferralIds.length === 0 || !bulkDoctorId) return;

    const patientNames = pendingReferrals
      .filter((r) => selectedReferralIds.includes(r.id))
      .map((r) => r.patient_name || `Patient #${r.patient_id}`);

    setConfirmDialog({
      isOpen: true,
      type: "bulk",
      referralIds: selectedReferralIds,
      patientNames,
      doctorId: Number(bulkDoctorId),
      doctorName: getDoctorName(Number(bulkDoctorId)),
    });
  };

  // Execute Confirmed Assignment
  const handleConfirmAssignment = async () => {
    if (confirmDialog.referralIds.length === 0 || !confirmDialog.doctorId) return;

    setIsProcessing(true);
    setError(null);
    setSuccessToast(null);

    try {
      // Execute assignment requests sequentially or concurrently
      await Promise.all(
        confirmDialog.referralIds.map((refId) =>
          assignDoctorToReferral(refId, confirmDialog.doctorId)
        )
      );

      const assignedCount = confirmDialog.referralIds.length;
      const targetDocName = confirmDialog.doctorName;

      // Update state: mark assigned referrals locally
      setReferrals((prev) =>
        prev.map((r) => {
          if (confirmDialog.referralIds.includes(r.id)) {
            return {
              ...r,
              assigned_doctor: confirmDialog.doctorId,
              assigned_doctor_name: targetDocName,
              status: "ASSIGNED",
            };
          }
          return r;
        })
      );

      // Clean up selections
      setSelectedReferralIds((prev) =>
        prev.filter((id) => !confirmDialog.referralIds.includes(id))
      );
      setBulkDoctorId("");
      setRowDoctorMap((prev) => {
        const next = { ...prev };
        confirmDialog.referralIds.forEach((id) => delete next[id]);
        return next;
      });

      // Show toast
      if (assignedCount === 1) {
        setSuccessToast(
          `Doctor assigned successfully (Referral #${confirmDialog.referralIds[0]} -> Dr. ${targetDocName}).`
        );
      } else {
        setSuccessToast(
          `Doctor assigned successfully (${assignedCount} referrals -> Dr. ${targetDocName}).`
        );
      }

      // Close modal
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to complete assignment. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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
              to="/admin/referrals"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Referrals
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
          <Link to="/admin/referrals" className="hover:text-blue-600 transition">
            Referral Management
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Assign Referrals</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Assign Referrals
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Assign pending clinical referral cases to available specialists.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/referrals"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Back to Referrals
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

        {/* Success Toast */}
        {successToast && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold text-emerald-900">Assignment Complete</p>
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
                <p className="font-semibold text-red-900">Assignment Error</p>
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
        <section aria-label="Assignment Metrics">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Pending Referrals */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Pending Referrals
                </span>
                <span className="text-lg">⏳</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-amber-700">
                  {summaryCounts.pending}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Awaiting doctor assignment
                </p>
              </div>
            </div>

            {/* Available Doctors */}
            <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  Available Doctors
                </span>
                <span className="text-lg">🩺</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-teal-700">
                  {summaryCounts.availableDocs}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Active specialists ready for cases
                </p>
              </div>
            </div>

            {/* Total Active Cases */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Total Active Cases
                </span>
                <span className="text-lg">📁</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.activeCases}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Currently assigned to doctors
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bulk Assignment Bar */}
        {pendingReferrals.length > 0 && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-indigo-950 select-none">
                  <input
                    type="checkbox"
                    checked={
                      pendingReferrals.length > 0 &&
                      selectedReferralIds.length === pendingReferrals.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Select All ({pendingReferrals.length})</span>
                </label>
                {selectedReferralIds.length > 0 && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                    {selectedReferralIds.length} selected
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <select
                  value={bulkDoctorId}
                  onChange={(e) =>
                    setBulkDoctorId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="w-full sm:w-72 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  disabled={isProcessing}
                >
                  <option value="">-- Choose Specialist for Bulk --</option>
                  {activeDoctors.map((doc) => {
                    const workload = doctorWorkloadMap.get(doc.id) || 0;
                    const name =
                      doc.full_name ||
                      `${doc.first_name || ""} ${doc.last_name || ""}`.trim() ||
                      doc.username;
                    return (
                      <option key={doc.id} value={doc.id}>
                        Dr. {name} ({workload} active {workload === 1 ? "case" : "cases"})
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={promptBulkAssign}
                  disabled={
                    isProcessing ||
                    selectedReferralIds.length === 0 ||
                    !bulkDoctorId
                  }
                  className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin text-xs">🌀</span>
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <span>Assign Selected ({selectedReferralIds.length})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Referrals Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading pending referrals...</span>
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
          {!loading && pendingReferrals.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600 border border-emerald-100">
                ✅
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No pending referrals require assignment.
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                All specialist referrals have been successfully assigned to doctors. New cases will appear here automatically.
              </p>
              <div className="mt-5">
                <Link
                  to="/admin/referrals"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  ← View All Referrals
                </Link>
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && pendingReferrals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedReferralIds.length === pendingReferrals.length
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        title="Select All"
                      />
                    </th>
                    <th className="py-3.5 px-4">Referral ID</th>
                    <th className="py-3.5 px-4">Patient</th>
                    <th className="py-3.5 px-4">AI Prediction</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Assign Doctor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {pendingReferrals.map((ref) => {
                    const priority = getPriority(ref.prediction);
                    const isSelected = selectedReferralIds.includes(ref.id);
                    const selectedDoc = rowDoctorMap[ref.id] || "";

                    return (
                      <tr
                        key={ref.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? "bg-indigo-50/30" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectReferral(ref.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Referral ID */}
                        <td className="py-4 px-4 font-mono font-bold text-slate-900">
                          #{ref.id}
                        </td>

                        {/* Patient */}
                        <td className="py-4 px-4">
                          {ref.patient_id ? (
                            <div>
                              <Link
                                to={`/admin/patients/${ref.patient_id}`}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1"
                              >
                                <span>{ref.patient_name || `Patient #${ref.patient_id}`}</span>
                                <span className="text-[10px] text-blue-500">↗</span>
                              </Link>
                              <p className="text-xs text-slate-400 font-mono">
                                ID: #{ref.patient_id}
                              </p>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-900">
                              {ref.patient_name || "—"}
                            </span>
                          )}
                        </td>

                        {/* AI Prediction */}
                        <td className="py-4 px-4">
                          {getPredictionBadge(ref.prediction)}
                        </td>

                        {/* Priority */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] border ${priority.className}`}
                          >
                            {priority.label}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-4 px-4 text-xs text-slate-500 font-mono">
                          {formatDate(ref.created_at)}
                        </td>

                        {/* Assign Doctor Action */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <select
                              value={selectedDoc}
                              onChange={(e) =>
                                setRowDoctorMap((prev) => ({
                                  ...prev,
                                  [ref.id]: e.target.value
                                    ? Number(e.target.value)
                                    : "",
                                }))
                              }
                              className="w-48 sm:w-56 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                              disabled={isProcessing}
                            >
                              <option value="">-- Select Doctor --</option>
                              {activeDoctors.map((doc) => {
                                const workload =
                                  doctorWorkloadMap.get(doc.id) || 0;
                                const name =
                                  doc.full_name ||
                                  `${doc.first_name || ""} ${doc.last_name || ""}`.trim() ||
                                  doc.username;
                                return (
                                  <option key={doc.id} value={doc.id}>
                                    Dr. {name} ({workload} active)
                                  </option>
                                );
                              })}
                            </select>

                            <button
                              type="button"
                              onClick={() => promptSingleAssign(ref)}
                              disabled={isProcessing || !selectedDoc}
                              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 transition"
                            >
                              Assign
                            </button>

                            <Link
                              to={`/admin/referrals/${ref.id}`}
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                              title="View Referral Details"
                            >
                              View →
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

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-xl font-bold">
                🩺
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmDialog.type === "bulk"
                    ? "Assign Multiple Referrals"
                    : "Assign Referral"}
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm specialist case assignment
                </p>
              </div>
            </div>

            <div className="text-sm text-slate-700 space-y-2">
              {confirmDialog.type === "single" ? (
                <p>
                  Assign Referral{" "}
                  <span className="font-bold text-slate-900 font-mono">
                    #{confirmDialog.referralIds[0]}
                  </span>{" "}
                  for{" "}
                  <span className="font-semibold text-slate-900">
                    {confirmDialog.patientNames[0]}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-indigo-700">
                    Dr. {confirmDialog.doctorName}
                  </span>
                  ?
                </p>
              ) : (
                <p>
                  Assign{" "}
                  <span className="font-bold text-slate-900">
                    {confirmDialog.referralIds.length} selected referrals
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-indigo-700">
                    Dr. {confirmDialog.doctorName}
                  </span>
                  ?
                </p>
              )}

              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                ℹ️ The referral status will become <span className="font-semibold text-blue-700">ASSIGNED</span> and appear immediately on Dr. {confirmDialog.doctorName}&apos;s dashboard.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
                }
                disabled={isProcessing}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={isProcessing}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin text-xs">🌀</span>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <span>Confirm Assignment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReferralsAssignPage;
