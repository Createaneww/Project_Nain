import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import {
  fetchReferralById,
  collectReferral,
  fetchDoctors,
  assignDoctorToReferral,
  type Referral,
  type DoctorUser,
} from "../../../../services/referrals";

function HealthWorkerReferralDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Doctors list for assignment
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [assigning, setAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // Collection modal & action state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [collecting, setCollecting] = useState<boolean>(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionSuccess, setCollectionSuccess] = useState<string | null>(null);

  const loadReferral = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const [data, doctorsList] = await Promise.all([
        fetchReferralById(id),
        fetchDoctors().catch(() => []),
      ]);
      setReferral(data);
      setDoctors(doctorsList);
      if (doctorsList.length > 0) {
        setSelectedDoctorId(String(doctorsList[0].id));
      }
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
    loadReferral();
  }, [loadReferral]);

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

  const handleAssignDoctor = async () => {
    if (!referral || !selectedDoctorId || assigning) return;
    setAssigning(true);
    setAssignError(null);
    setAssignSuccess(null);

    try {
      const updated = await assignDoctorToReferral(referral.id, Number(selectedDoctorId));
      setReferral(updated);
      setAssignSuccess(
        `Assigned successfully to Dr. ${updated.assigned_doctor_name || "Doctor"}`
      );
    } catch (err) {
      if (err instanceof Error) {
        setAssignError(err.message || "Failed to assign doctor.");
      } else {
        setAssignError("Failed to assign doctor. Please try again.");
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleConfirmCollect = async () => {
    if (!referral || collecting) return;
    setCollecting(true);
    setCollectionError(null);
    setCollectionSuccess(null);

    try {
      const updated = await collectReferral(referral.id);
      setReferral(updated);
      setCollectionSuccess("Report collected successfully.");
      setShowConfirmModal(false);
    } catch (err) {
      if (err instanceof Error) {
        setCollectionError(err.message || "Unable to collect the report. Please try again.");
      } else {
        setCollectionError("Unable to collect the report. Please try again.");
      }
    } finally {
      setCollecting(false);
    }
  };

  // Prediction badge
  const getPredictionBadge = (prediction?: string) => {
    const p = (prediction || "").toUpperCase();
    if (p.includes("NO DR") || p.includes("NORMAL")) {
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          No DR
        </span>
      );
    }
    if (p.includes("MILD")) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          Mild
        </span>
      );
    }
    if (p.includes("MODERATE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
          Moderate
        </span>
      );
    }
    if (p.includes("SEVERE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          Severe
        </span>
      );
    }
    if (p.includes("PROLIFERATIVE")) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          Proliferative
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
        {prediction || "—"}
      </span>
    );
  };

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "REVIEWED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Reviewed
          </span>
        );
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Collected
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Assigned
          </span>
        );
      case "PENDING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Pending Assignment
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/health-worker/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Return to Dashboard"
            >
              👁️
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">NAIN AI</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                  Health Worker
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Diabetic Retinopathy Screening System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/health-worker/referrals"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Referrals
            </Link>
            {storedUser && (
              <span className="hidden md:inline-block text-xs font-medium text-slate-500 border-l border-slate-200 pl-3">
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            to="/health-worker/dashboard"
            className="hover:text-blue-600 transition"
          >
            Dashboard
          </Link>
          <span>/</span>
          <Link
            to="/health-worker/referrals"
            className="hover:text-blue-600 transition"
          >
            Referrals
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Referral Details</span>
        </nav>

        {/* Page Title & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Referral Details
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View doctor review and finalized screening report information.
            </p>
          </div>
          <Link
            to="/health-worker/referrals"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            ← Back to Referrals
          </Link>
        </div>

        {/* Assign Doctor Success Alert */}
        {assignSuccess && (
          <div
            className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm flex items-center gap-3"
            role="status"
          >
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold text-blue-900">{assignSuccess}</p>
              <p className="text-xs text-blue-700 mt-0.5">
                The referral is now assigned and visible on the doctor's dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {collectionSuccess && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center gap-3"
            role="status"
          >
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold text-emerald-900">{collectionSuccess}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                The referral status is now updated to COLLECTED.
              </p>
            </div>
          </div>
        )}

        {/* Collection Error Alert */}
        {collectionError && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-start gap-3"
            role="alert"
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-900">Action Failed</p>
              <p className="mt-0.5 text-xs text-red-700">{collectionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-200 rounded"></div>
              <div className="h-4 w-64 bg-slate-100 rounded"></div>
              <div className="h-32 bg-slate-100 rounded-xl"></div>
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
              No referral record exists with ID #{id}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/health-worker/referrals"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Back to Referrals
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load referral details.
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={loadReferral}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded Referral Content */}
        {!loading && !error && referral && (
          <div className="space-y-6">
            {/* 1. TOP STATUS CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900">
                      Referral #{referral.id}
                    </span>
                    {getStatusBadge(referral.status)}
                  </div>
                  <p className="text-sm font-medium text-slate-600 mt-1">
                    Patient: <span className="font-bold text-slate-900">{referral.patient_name || `Patient #${referral.patient_id}`}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created on {formatDate(referral.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left sm:text-right bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-medium block">AI Prediction</span>
                    <div className="mt-1">{getPredictionBadge(referral.prediction)}</div>
                  </div>
                </div>
              </div>

              {/* 2. PATIENT & SCREENING INFORMATION */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                  Patient & Screening Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-slate-500 font-medium block">Patient Name</span>
                    <span className="font-bold text-slate-900 mt-1 block truncate">
                      {referral.patient_name || "—"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-slate-500 font-medium block">Patient ID</span>
                    <span className="font-bold text-slate-900 font-mono mt-1 block">
                      #{referral.patient_id}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-slate-500 font-medium block">Screening ID</span>
                    <Link
                      to={`/health-worker/screenings/${referral.screening_id}`}
                      className="font-bold text-blue-600 hover:underline font-mono mt-1 block"
                    >
                      #{referral.screening_id}
                    </Link>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                    <span className="text-slate-500 font-medium block">Report ID</span>
                    <Link
                      to={`/health-worker/reports/${referral.report_id}`}
                      className="font-bold text-blue-600 hover:underline font-mono mt-1 block"
                    >
                      #{referral.report_id}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DOCTOR REVIEW SECTION & ASSIGNMENT */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Doctor Review
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ophthalmologist evaluation, diagnosis, and prescription notes.
                  </p>
                </div>
                {getStatusBadge(referral.status)}
              </div>

              {/* Doctor Review Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-5">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Assigned Doctor</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {referral.assigned_doctor_name ? `Dr. ${referral.assigned_doctor_name}` : "Not assigned"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Review Status</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {referral.status}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Reviewed At</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {referral.reviewed_at ? formatDate(referral.reviewed_at) : "Not reviewed yet"}
                  </span>
                </div>
              </div>

              {/* Doctor Assignment Area if unassigned */}
              {!referral.assigned_doctor && referral.status === "PENDING" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 mb-5 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Assign Case to Doctor
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Select an active ophthalmologist to review and evaluate this referral case.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      disabled={assigning || doctors.length === 0}
                      className="w-full sm:flex-1 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {doctors.length === 0 ? (
                        <option value="">No doctors found</option>
                      ) : (
                        doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.full_name} ({doc.username})
                          </option>
                        ))
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={handleAssignDoctor}
                      disabled={assigning || !selectedDoctorId}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition disabled:bg-amber-400"
                    >
                      {assigning ? "Assigning..." : "Assign Doctor →"}
                    </button>
                  </div>

                  {assignError && (
                    <p className="text-xs font-semibold text-red-700">
                      {assignError}
                    </p>
                  )}
                </div>
              )}

              {/* Doctor Notes Display */}
              <div>
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Doctor Notes
                </h4>
                {referral.doctor_notes ? (
                  <div className="rounded-xl bg-slate-50/80 p-5 border border-slate-200/80 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {referral.doctor_notes}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                    No doctor notes available.
                  </div>
                )}
              </div>
            </div>

            {/* 4. COLLECTION STATUS SECTION */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-base font-bold text-slate-900">
                  Collection Status
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Finalized report collection and dispatch record.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-6">
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Collection Status</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {referral.status === "COLLECTED" ? "Report Collected" : referral.status === "REVIEWED" ? "Ready for collection" : "Awaiting collection"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Collected By</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {referral.collected_by_name || "—"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-500 font-medium block">Collected At</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {referral.collected_at ? formatDate(referral.collected_at) : "—"}
                  </span>
                </div>
              </div>

              {/* ACTION AREA ACCORDING TO STATUS */}

              {/* Status: REVIEWED -> Show Collect Report Button */}
              {referral.status === "REVIEWED" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Ready for collection
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Doctor review is complete. Click below to collect the report for patient dispatch.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    <span>✓</span>
                    <span>Collect Report</span>
                  </button>
                </div>
              )}

              {/* Status: COLLECTED -> Show Completed State */}
              {referral.status === "COLLECTED" && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-base">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-purple-950">
                        ✓ Report Collected
                      </h4>
                      <p className="text-xs text-purple-800 mt-0.5">
                        Collected by {referral.collected_by_name || "Health Worker"} on {formatDate(referral.collected_at)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/health-worker/reports/${referral.report_id}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-purple-500/20 hover:bg-purple-700 transition"
                  >
                    <span>View AI Screening Report</span>
                    <span>→</span>
                  </Link>
                </div>
              )}

              {/* Status: PENDING */}
              {referral.status === "PENDING" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 flex items-center gap-2.5">
                  <span>ℹ️</span>
                  <span>Awaiting doctor assignment and review.</span>
                </div>
              )}

              {/* Status: ASSIGNED */}
              {referral.status === "ASSIGNED" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-800 flex items-center gap-2.5">
                  <span>ℹ️</span>
                  <span>Awaiting doctor review.</span>
                </div>
              )}

              {/* Bottom Navigation Actions */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
                <Link
                  to="/health-worker/referrals"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  ← Back to Referrals
                </Link>
                <Link
                  to={`/health-worker/reports/${referral.report_id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  View AI Report →
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CONFIRMATION MODAL FOR COLLECT REPORT */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-xl font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Collect Finalized Report?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This will mark the doctor-reviewed referral as collected.
                </p>
              </div>
            </div>

            {collectionError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {collectionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setCollectionError(null);
                }}
                disabled={collecting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCollect}
                disabled={collecting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:bg-emerald-400 disabled:cursor-not-allowed"
              >
                {collecting ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    <span>Collecting...</span>
                  </>
                ) : (
                  <span>Collect Report</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthWorkerReferralDetailPage;
