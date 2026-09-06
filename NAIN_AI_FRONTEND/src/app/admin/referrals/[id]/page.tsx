import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchReferralById,
  assignDoctorToReferral,
  fetchReferrals,
  type Referral,
} from "../../../../services/referrals";
import {
  fetchReportById,
  type Report,
  resolveImageUrl,
} from "../../../../services/reports";
import {
  fetchPatientById,
  type Patient,
} from "../../../../services/patients";
import {
  fetchAdminUsers,
  type AdminUser,
} from "../../../../services/users";

function AdminReferralDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<AdminUser[]>([]);
  const [allReferrals, setAllReferrals] = useState<Referral[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Assignment / Reassignment state
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | "">("");
  const [assigning, setAssigning] = useState<boolean>(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showReassignBox, setShowReassignBox] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const [refData, usersData, referralsList] = await Promise.all([
        fetchReferralById(id),
        fetchAdminUsers({ role: "DOCTOR" }).catch(() => []),
        fetchReferrals().catch(() => []),
      ]);

      setReferral(refData);
      setDoctors(usersData.filter((u) => u.role.toUpperCase() === "DOCTOR"));
      setAllReferrals(referralsList);

      // Concurrently fetch linked report and patient
      const promises: [Promise<Report | null>, Promise<Patient | null>] = [
        refData.report_id
          ? fetchReportById(refData.report_id).catch(() => null)
          : Promise.resolve(null),
        refData.patient_id
          ? fetchPatientById(refData.patient_id).catch(() => null)
          : Promise.resolve(null),
      ];

      const [reportData, patientData] = await Promise.all(promises);
      setReport(reportData);
      setPatient(patientData);
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
        setError("Unable to load referral details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  // Workload map for doctor select options
  const doctorWorkloadMap = useMemo(() => {
    const map = new Map<number, number>();
    doctors.forEach((d) => map.set(d.id, 0));
    allReferrals.forEach((r) => {
      if (r.assigned_doctor && r.status === "ASSIGNED") {
        const count = map.get(r.assigned_doctor) || 0;
        map.set(r.assigned_doctor, count + 1);
      }
    });
    return map;
  }, [doctors, allReferrals]);

  // Handle Assign / Reassign doctor
  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referral || !selectedDoctorId || assigning) return;

    const wasReassign = referral.status === "ASSIGNED" || referral.assigned_doctor !== null;

    setAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const updatedRef = await assignDoctorToReferral(
        referral.id,
        Number(selectedDoctorId)
      );
      setReferral(updatedRef);
      setShowReassignBox(false);

      const assignedDoc = doctors.find((d) => d.id === Number(selectedDoctorId));
      const docName =
        assignedDoc?.full_name ||
        `${assignedDoc?.first_name || ""} ${assignedDoc?.last_name || ""}`.trim() ||
        assignedDoc?.username ||
        updatedRef.assigned_doctor_name ||
        "Doctor";

      setAssignSuccess(
        wasReassign
          ? `Doctor reassigned successfully (Dr. ${docName}).`
          : `Doctor assigned successfully (Dr. ${docName}).`
      );
      setSelectedDoctorId("");

      try {
        const fresh = await fetchReferralById(referral.id);
        setReferral(fresh);
      } catch {
        // Fallback
      }

      // Refresh list in background
      fetchReferrals().then(setAllReferrals).catch(() => {});
    } catch (err) {
      if (err instanceof Error) {
        setAssignError(err.message);
      } else {
        setAssignError("Failed to assign doctor. Please try again.");
      }
    } finally {
      setAssigning(false);
    }
  };

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Report Collected
          </span>
        );
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Doctor Reviewed
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Assigned to Doctor
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending Assignment
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
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          No DR
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
          Mild DR
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 border border-orange-200">
          Moderate DR
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
          Severe DR
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">
          Proliferative DR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
        {prediction}
      </span>
    );
  };

  const originalImg = resolveImageUrl(report?.original_image_url);
  const gradcamImg = resolveImageUrl(report?.gradcam_url);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              Clinical Referral Details
            </span>
            <span className="text-xs text-slate-400 font-mono">Case #{id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Specialist Referral #{id}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Clinical ophthalmologist assignment, evaluation notes, AI report, and collection tracking.
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
            All Referrals
          </Link>
          {referral?.patient_id && (
            <Link
              to={`/admin/patients/${referral.patient_id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Patient Profile
            </Link>
          )}
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

        {/* Assignment Success Banner */}
        {assignSuccess && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-semibold text-emerald-900">Doctor Assignment Updated</p>
                <p className="text-xs text-emerald-700 mt-0.5">{assignSuccess}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAssignSuccess(null)}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-bold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Assignment Error Banner */}
        {assignError && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <div>
                <p className="font-semibold text-red-900">Assignment Error</p>
                <p className="text-xs text-red-700 mt-0.5">{assignError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAssignError(null)}
              className="text-xs text-red-600 hover:text-red-800 font-bold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="h-28 rounded-2xl bg-white border border-slate-200 p-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 h-96 rounded-2xl bg-white border border-slate-200"></div>
              <div className="h-96 rounded-2xl bg-white border border-slate-200"></div>
            </div>
          </div>
        )}

        {/* Not Found */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Referral not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No specialist referral exists with ID #{id}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/admin/referrals"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Referrals
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load referral details
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded Referral Data */}
        {!loading && !error && referral && (
          <div className="space-y-6">
            {/* Top Status Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold text-slate-700 border border-slate-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-lg">
                      Referral #{referral.id}
                    </span>
                    {getStatusBadge(referral.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created on {formatDate(referral.created_at)}
                  </p>
                </div>
              </div>

              <div>
                {getPredictionBadge(referral.prediction)}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: Doctor Assignment & Clinical Review */}
              <div className="lg:col-span-2 space-y-6">
                {/* Check if case is No DR */}
                {(() => {
                  const pred = (referral.prediction || report?.prediction || "").toUpperCase();
                  const isNoDR = pred.includes("NO DR") || pred.includes("NORMAL") || pred === "0";
                  if (isNoDR) {
                    return (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm space-y-2">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>No Doctor Assignment Required (Normal / No DR)</span>
                        </div>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          This patient screening was evaluated as <strong>No Diabetic Retinopathy</strong>. Cases with No DR do not require specialist doctor review or assignment. The AI report is saved and available to Admin and Health Worker for routine collection.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 1. DOCTOR ASSIGNMENT / REASSIGNMENT ACTION CARD (FOR PENDING OR ASSIGNED NON-NO DR CASES) */}
                {(() => {
                  const pred = (referral.prediction || report?.prediction || "").toUpperCase();
                  const isNoDR = pred.includes("NO DR") || pred.includes("NORMAL") || pred === "0";
                  if (isNoDR) return false;
                  return referral.status === "PENDING" || referral.status === "ASSIGNED" || showReassignBox;
                })() && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-7 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
                          <span>
                            {referral.status === "PENDING"
                              ? "Assign Specialist Doctor"
                              : "Reassign Doctor"}
                          </span>
                        </h3>
                        <p className="text-xs text-indigo-700/80 mt-0.5">
                          Select an active ophthalmologist to review this case and issue clinical recommendations.
                        </p>
                      </div>
                      {referral.status === "ASSIGNED" && !showReassignBox && (
                        <button
                          type="button"
                          onClick={() => setShowReassignBox(true)}
                          className="rounded-xl border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 transition"
                        >
                          Reassign Doctor ↻
                        </button>
                      )}
                    </div>

                    {(referral.status === "PENDING" || showReassignBox) && (
                      <form onSubmit={handleAssignDoctor} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          <div className="sm:col-span-2 space-y-1.5">
                            <label className="block text-xs font-semibold text-indigo-900">
                              Choose Ophthalmologist:
                            </label>
                            <select
                              value={selectedDoctorId}
                              onChange={(e) =>
                                setSelectedDoctorId(
                                  e.target.value ? Number(e.target.value) : ""
                                )
                              }
                              className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              disabled={assigning}
                              required
                            >
                              <option value="">-- Select Specialist Doctor --</option>
                              {doctors
                                .filter((d) => d.is_active)
                                .map((doc) => {
                                  const pendingCount =
                                    doctorWorkloadMap.get(doc.id) || 0;
                                  const dName =
                                    doc.full_name ||
                                    `${doc.first_name || ""} ${doc.last_name || ""}`.trim() ||
                                    doc.username;
                                  return (
                                    <option key={doc.id} value={doc.id}>
                                      Dr. {dName} (@{doc.username}) — {pendingCount} active {pendingCount === 1 ? "case" : "cases"}
                                    </option>
                                  );
                                })}
                            </select>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={assigning || !selectedDoctorId}
                              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                            >
                              {assigning ? (
                                <>
                                  <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                                  <span>Assigning...</span>
                                </>
                              ) : (
                                <span>
                                  {referral.status === "PENDING"
                                    ? "Assign Case"
                                    : "Confirm Reassignment"}
                                </span>
                              )}
                            </button>
                            {showReassignBox && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReassignBox(false);
                                  setSelectedDoctorId("");
                                }}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        {doctors.length === 0 && (
                          <p className="text-xs text-amber-700">
                            No active doctor accounts found. Create doctor accounts in User Management first.
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                )}

                {/* 2. DOCTOR CLINICAL REVIEW CARD */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Ophthalmologist Clinical Evaluation
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Specialist diagnosis, clinical recommendations, and treatment plan.
                      </p>
                    </div>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
                  </div>

                  {/* Doctor Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="text-slate-500 font-medium block">Assigned Doctor</span>
                      <span className="font-bold text-slate-900 text-sm mt-1 block">
                        {referral.assigned_doctor_name ? (
                          <span className="text-indigo-700 flex items-center gap-1.5">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>
                            <span>Dr. {referral.assigned_doctor_name}</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-normal italic">
                            Unassigned (Pending Assignment)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="text-slate-500 font-medium block">Review Timestamp</span>
                      <span className="font-bold text-slate-900 font-mono text-sm mt-1 block">
                        {referral.reviewed_at
                          ? formatDate(referral.reviewed_at)
                          : "Pending doctor review"}
                      </span>
                    </div>
                  </div>

                  {/* Clinical Notes Box */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Clinical Notes & Prescription
                    </span>
                    <div className="rounded-xl bg-slate-50 p-5 border border-slate-200 text-sm text-slate-800 min-h-[100px] whitespace-pre-wrap leading-relaxed">
                      {referral.doctor_notes ? (
                        referral.doctor_notes
                      ) : (
                        <p className="text-slate-400 italic text-xs">
                          {referral.status === "PENDING"
                            ? "Assign a doctor above. The specialist will review fundus scans and add prescription notes."
                            : referral.status === "ASSIGNED"
                            ? "Assigned to Dr. " + (referral.assigned_doctor_name || "doctor") + ". Clinical evaluation is currently pending."
                            : "No clinical notes recorded."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. RETINAL IMAGING & GRAD-CAM VISUALIZATION */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Retinal Scans & AI Heatmap
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        High-resolution fundus photograph and Grad-CAM attention overlay.
                      </p>
                    </div>
                    {report?.confidence !== undefined && (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
                        Confidence: {(report.confidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Original Fundus Image */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600 block">
                        Original Fundus Image
                      </span>
                      <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {originalImg ? (
                          <img
                            src={originalImg}
                            alt="Original Fundus Scan"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">
                            Image not available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Grad-CAM Heatmap Image */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-600 block">
                        Grad-CAM Attention Map
                      </span>
                      <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
                        {gradcamImg ? (
                          <img
                            src={gradcamImg}
                            alt="Grad-CAM Heatmap"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500">
                            Heatmap not generated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Metadata Sidebar */}
              <div className="space-y-6">
                {/* Patient Summary Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Patient Details
                    </h4>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>

                  <div>
                    <Link
                      to={`/admin/patients/${referral.patient_id}`}
                      className="font-bold text-slate-900 text-base hover:text-blue-600 transition block"
                    >
                      {referral.patient_name || patient?.full_name || `Patient #${referral.patient_id}`}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      ID: #{referral.patient_id}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    {patient && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Age:</span>
                          <span className="font-semibold text-slate-800">{patient.age} yrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Gender:</span>
                          <span className="font-semibold text-slate-800">{patient.gender}</span>
                        </div>
                        {patient.phone_number && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Phone:</span>
                            <span className="font-semibold font-mono text-slate-800">
                              {patient.phone_number}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Link
                    to={`/admin/patients/${referral.patient_id}`}
                    className="w-full text-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition block mt-2"
                  >
                    View Full Patient Profile →
                  </Link>
                </div>

                {/* Screening Reference */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold uppercase tracking-wider text-slate-500">
                      Screening Record
                    </h4>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Screening ID:</span>
                    <Link
                      to={`/admin/screenings/${referral.screening_id}`}
                      className="font-mono font-bold text-blue-600 hover:underline"
                    >
                      #{referral.screening_id}
                    </Link>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Report ID:</span>
                    <span className="font-mono font-bold text-slate-900">
                      #{referral.report_id}
                    </span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Referral Status:</span>
                    <span>{getStatusBadge(referral.status)}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Created Date:</span>
                    <span className="font-mono text-slate-700">
                      {formatDate(referral.created_at)}
                    </span>
                  </div>

                  {referral.collected_at && (
                    <div className="flex justify-between py-1 border-t border-slate-100 pt-2">
                      <span className="text-slate-400">Collected:</span>
                      <span className="font-mono text-slate-700">
                        {formatDate(referral.collected_at)}
                      </span>
                    </div>
                  )}

                  <Link
                    to={`/admin/screenings/${referral.screening_id}`}
                    className="w-full text-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition block mt-2"
                  >
                    Open Screening Session →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default AdminReferralDetailPage;
