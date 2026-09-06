import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
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

  // Check if case is No DR
  const isNoDR = (prediction?: string | null) => {
    const p = (prediction || "").toUpperCase();
    return p.includes("NO DR") || p.includes("NORMAL") || p === "0";
  };

  // Priority rank helper
  const getPriorityRank = (prediction?: string | null, priority?: string | null): number => {
    const prio = (priority || "").toUpperCase();
    const p = (prediction || "").toUpperCase();
    if (prio === "URGENT" || p.includes("PROLIFERATIVE")) return 1;
    if (prio === "HIGH" || p.includes("SEVERE")) return 2;
    if (prio === "MEDIUM" || p.includes("MODERATE")) return 3;
    if (prio === "LOW" || p.includes("MILD")) return 4;
    return 5;
  };

  // Pending unassigned referrals list (excluding No DR cases, ordered by clinical priority)
  const pendingReferrals = useMemo(() => {
    return referrals
      .filter(
        (r) => (r.status === "PENDING" || !r.assigned_doctor) && !isNoDR(r.prediction)
      )
      .sort((a, b) => {
        const rankA = getPriorityRank(a.prediction, a.priority);
        const rankB = getPriorityRank(b.prediction, b.priority);
        if (rankA !== rankB) return rankA - rankB;
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      });
  }, [referrals]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const pending = pendingReferrals.length;
    const availableDocs = activeDoctors.length;
    const activeCases = referrals.filter((r) => r.status === "ASSIGNED").length;
    return { pending, availableDocs, activeCases };
  }, [pendingReferrals, activeDoctors, referrals]);

  // Priority calculation based on AI prediction and priority field
  const getPriority = (prediction?: string | null, priority?: string | null) => {
    const prio = (priority || "").toUpperCase();
    const p = (prediction || "").toUpperCase();
    if (prio === "URGENT" || p.includes("PROLIFERATIVE")) {
      return {
        label: "URGENT",
        className: "bg-red-100 text-red-800 border-red-300 font-black",
      };
    }
    if (prio === "HIGH" || p.includes("SEVERE")) {
      return {
        label: "HIGH",
        className: "bg-rose-100 text-rose-800 border-rose-300 font-bold",
      };
    }
    if (prio === "MEDIUM" || p.includes("MODERATE")) {
      return {
        label: "MEDIUM",
        className: "bg-amber-100 text-amber-800 border-amber-300 font-semibold",
      };
    }
    if (prio === "LOW" || p.includes("MILD")) {
      return {
        label: "LOW",
        className: "bg-blue-100 text-blue-800 border-blue-300 font-semibold",
      };
    }
    return {
      label: "LOW",
      className: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
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

      // Update state: mark assigned referrals locally and sync from backend
      try {
        const freshList = await fetchReferrals();
        setReferrals(freshList);
      } catch {
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
      }

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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              Workload Distribution
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {pendingReferrals.length} Pending Referrals
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Assign Referrals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign pending clinical referral cases to available specialist doctors.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/referrals"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Referrals
          </Link>
          <button
            type="button"
            onClick={loadData}
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-900">Assignment Complete</p>
                <p className="text-xs text-emerald-700 mt-0.5">{successToast}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-emerald-600 hover:text-emerald-800 p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
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
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Pending Referrals
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  {summaryCounts.pending}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Awaiting doctor assignment
                </p>
              </div>
            </div>

            {/* Available Doctors */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  Available Doctors
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
                  {summaryCounts.availableDocs}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Active specialists ready for cases
                </p>
              </div>
            </div>

            {/* Total Active Cases */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Total Active Cases
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-slate-900">
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
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
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
                <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
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
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
                          selectedReferralIds.length === pendingReferrals.length &&
                          pendingReferrals.length > 0
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
                    const priority = getPriority(ref.prediction, ref.priority);
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

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
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

              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>The referral status will become <strong className="font-semibold text-blue-700">ASSIGNED</strong> and appear immediately on Dr. {confirmDialog.doctorName}&apos;s dashboard.</span>
              </div>
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
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
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
