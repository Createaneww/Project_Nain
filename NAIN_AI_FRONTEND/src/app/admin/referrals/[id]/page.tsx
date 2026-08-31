import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

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
    if (!referral || !selectedDoctorId) return;

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
      setSelectedDoctorId("");

      const assignedDoc = doctors.find((d) => d.id === Number(selectedDoctorId));
      const docName =
        assignedDoc?.full_name ||
        `${assignedDoc?.first_name || ""} ${assignedDoc?.last_name || ""}`.trim() ||
        assignedDoc?.username ||
        "Doctor";

      setAssignSuccess(
        `Referral #${referral.id} successfully assigned to Dr. ${docName}. Case status is now ASSIGNED.`
      );

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Return to Dashboard"
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

      {/* Main Content */}
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
          <span className="text-slate-800 font-medium">Referral #{id}</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Specialist Referral Details
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Clinical ophthalmologist assignment, evaluation notes, AI report, and collection tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/referrals"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Back to Referrals
            </Link>
            {referral?.patient_id && (
              <Link
                to={`/admin/patients/${referral.patient_id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                ← Back to Patient
              </Link>
            )}
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

        {/* Assignment Success Banner */}
        {assignSuccess && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
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
              ✕
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
              <span className="text-xl">⚠️</span>
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
              ✕
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
              📋
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
                  📋
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
                {/* 1. DOCTOR ASSIGNMENT / REASSIGNMENT ACTION CARD (FOR PENDING OR ASSIGNED) */}
                {(referral.status === "PENDING" ||
                  referral.status === "ASSIGNED" ||
                  showReassignBox) && (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-7 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
                          <span>🩺</span>
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
                                  <span className="animate-spin text-xs">🌀</span>
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
                    <span className="text-xl">🩺</span>
                  </div>

                  {/* Doctor Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="text-slate-500 font-medium block">Assigned Doctor</span>
                      <span className="font-bold text-slate-900 text-sm mt-1 block">
                        {referral.assigned_doctor_name ? (
                          <span className="text-indigo-700 flex items-center gap-1.5">
                            <span>🩺</span>
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
                    <span className="text-lg">👤</span>
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
                    <span className="text-lg">👁️</span>
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
      </main>
    </div>
  );
}

export default AdminReferralDetailPage;
