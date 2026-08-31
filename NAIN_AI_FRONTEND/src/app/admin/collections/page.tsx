import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import {
  fetchReferrals,
  collectReferral,
  type Referral,
} from "../../../services/referrals";

interface CollectModalState {
  isOpen: boolean;
  referral: Referral | null;
  collectionMethod: "ADMIN_OFFICE" | "HEALTH_WORKER";
  notes: string;
}

function AdminCollectionsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  // Collection modal & action state
  const [collectModal, setCollectModal] = useState<CollectModalState>({
    isOpen: false,
    referral: null,
    collectionMethod: "ADMIN_OFFICE",
    notes: "",
  });
  const [isCollecting, setIsCollecting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchReferrals();
      setReferrals(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load report collection data. Please try again.");
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
            Ready for Collection
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
            Pending Assignment
          </span>
        );
    }
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

  // Determine collection method category for a referral
  const getCollectionMethod = (r: Referral): "ADMIN_OFFICE" | "HEALTH_WORKER" | "UNCOLLECTED" => {
    if (r.status !== "COLLECTED") return "UNCOLLECTED";
    if (r.collected_by_role === "ADMIN") return "ADMIN_OFFICE";
    if (r.collected_by_role === "HEALTH_WORKER") return "HEALTH_WORKER";
    // Fallback based on name if role is not populated
    if (r.collected_by_name?.toLowerCase().includes("admin")) return "ADMIN_OFFICE";
    return "HEALTH_WORKER";
  };

  // Summary counts
  const summaryCounts = useMemo(() => {
    const readyForCollection = referrals.filter((r) => r.status === "REVIEWED").length;
    const collectedReports = referrals.filter((r) => r.status === "COLLECTED").length;

    let adminOfficeCount = 0;
    let healthWorkerCount = 0;

    referrals.forEach((r) => {
      if (r.status === "COLLECTED") {
        const method = getCollectionMethod(r);
        if (method === "ADMIN_OFFICE") {
          adminOfficeCount += 1;
        } else {
          healthWorkerCount += 1;
        }
      }
    });

    return {
      readyForCollection,
      collectedReports,
      adminOfficeCount,
      healthWorkerCount,
    };
  }, [referrals]);

  // Filtered referrals list for the collection view (only REVIEWED and COLLECTED relevant cases)
  const collectionList = useMemo(() => {
    return referrals.filter((r) => {
      // Must be at least REVIEWED or COLLECTED to be in collections scope, unless ALL chosen
      const isRelevantStatus =
        statusFilter === "ALL"
          ? r.status === "REVIEWED" || r.status === "COLLECTED"
          : r.status === statusFilter;

      if (!isRelevantStatus) return false;

      // Method filter
      if (methodFilter !== "ALL") {
        const method = getCollectionMethod(r);
        if (methodFilter === "ADMIN_OFFICE" && method !== "ADMIN_OFFICE") return false;
        if (methodFilter === "HEALTH_WORKER" && method !== "HEALTH_WORKER") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const patientName = (r.patient_name || "").toLowerCase();
        const patientId = String(r.patient_id || "");
        const referralId = String(r.id);
        const doctorName = (r.assigned_doctor_name || "").toLowerCase();
        const collectorName = (r.collected_by_name || "").toLowerCase();

        return (
          patientName.includes(q) ||
          patientId.includes(q) ||
          referralId.includes(q) ||
          doctorName.includes(q) ||
          collectorName.includes(q)
        );
      }

      return true;
    });
  }, [referrals, statusFilter, methodFilter, searchQuery]);

  // Prompt Collection Modal
  const openCollectModal = (referral: Referral) => {
    setCollectModal({
      isOpen: true,
      referral,
      collectionMethod: "ADMIN_OFFICE",
      notes: "",
    });
  };

  // Submit Collection to backend API
  const handleConfirmCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModal.referral) return;

    setIsCollecting(true);
    setError(null);
    setSuccessToast(null);

    try {
      const updated = await collectReferral(collectModal.referral.id);

      // Update state locally
      setReferrals((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );

      setSuccessToast(
        `Report for Referral #${updated.id} collected successfully from Admin Office.`
      );

      setCollectModal({
        isOpen: false,
        referral: null,
        collectionMethod: "ADMIN_OFFICE",
        notes: "",
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to collect report. Please try again.");
      }
    } finally {
      setIsCollecting(false);
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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Report Collection</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Report Collection
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Collect finalized and reviewed referral reports from the Admin Office or track field collections.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/referrals"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← All Referrals
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
                <p className="font-semibold text-emerald-900">Collection Successful</p>
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
                <p className="font-semibold text-red-900">Collection Error</p>
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

        {/* Top Summary Cards */}
        <section aria-label="Collection Summary">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Ready for Collection */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Ready for Collection
                </span>
                <span className="text-lg">📥</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-emerald-700">
                  {summaryCounts.readyForCollection}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Doctor reviewed cases
                </p>
              </div>
            </div>

            {/* Collected Reports */}
            <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                  Collected Reports
                </span>
                <span className="text-lg">📦</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-purple-700">
                  {summaryCounts.collectedReports}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Delivered to patient
                </p>
              </div>
            </div>

            {/* Admin Office Collection */}
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Admin Office
                </span>
                <span className="text-lg">🏢</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-700">
                  {summaryCounts.adminOfficeCount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Collected by Administrator
                </p>
              </div>
            </div>

            {/* Health Worker Collection */}
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Health Worker Field
                </span>
                <span className="text-lg">🩺</span>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold text-indigo-700">
                  {summaryCounts.healthWorkerCount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Collected in field
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
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
                placeholder="Search by patient name, patient ID, referral ID, doctor..."
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
            <div className="w-full sm:w-56">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Statuses ({summaryCounts.readyForCollection + summaryCounts.collectedReports})</option>
                <option value="REVIEWED">
                  Ready for Collection ({summaryCounts.readyForCollection})
                </option>
                <option value="COLLECTED">
                  Collected ({summaryCounts.collectedReports})
                </option>
              </select>
            </div>

            {/* Method Filter */}
            <div className="w-full sm:w-56">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Collection Methods</option>
                <option value="ADMIN_OFFICE">
                  Admin Office ({summaryCounts.adminOfficeCount})
                </option>
                <option value="HEALTH_WORKER">
                  Health Worker Field ({summaryCounts.healthWorkerCount})
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                <span className="animate-spin">🌀</span>
                <span>Loading report collection records...</span>
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
          {!loading && collectionList.length === 0 && (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                📥
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {searchQuery || statusFilter !== "ALL" || methodFilter !== "ALL"
                  ? "No collection records match your criteria."
                  : "No reports are currently ready for collection."}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL" || methodFilter !== "ALL"
                  ? "Try resetting filters or searching with different keywords."
                  : "Reviewed referrals from ophthalmologists will appear here ready for collection."}
              </p>
              {(searchQuery || statusFilter !== "ALL" || methodFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setMethodFilter("ALL");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Table Data */}
          {!loading && collectionList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 sm:px-6">Referral ID</th>
                    <th className="py-3.5 px-4 sm:px-6">Patient</th>
                    <th className="py-3.5 px-4 sm:px-6">AI Prediction</th>
                    <th className="py-3.5 px-4 sm:px-6">Assigned Doctor</th>
                    <th className="py-3.5 px-4 sm:px-6">Status</th>
                    <th className="py-3.5 px-4 sm:px-6">Collection Method</th>
                    <th className="py-3.5 px-4 sm:px-6">Collected By</th>
                    <th className="py-3.5 px-4 sm:px-6">Collection Date</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {collectionList.map((ref) => {
                    const method = getCollectionMethod(ref);

                    return (
                      <tr
                        key={ref.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Referral ID */}
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                          #{ref.id}
                        </td>

                        {/* Patient */}
                        <td className="py-4 px-4 sm:px-6">
                          <div>
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
                            {ref.patient_id && (
                              <p className="text-xs text-slate-400 font-mono">
                                ID: #{ref.patient_id}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* AI Prediction */}
                        <td className="py-4 px-4 sm:px-6">
                          {getPredictionBadge(ref.prediction)}
                        </td>

                        {/* Assigned Doctor */}
                        <td className="py-4 px-4 sm:px-6 text-xs font-semibold text-slate-800">
                          {ref.assigned_doctor_name ? (
                            <span className="flex items-center gap-1 text-indigo-700">
                              <span>🩺</span>
                              <span>Dr. {ref.assigned_doctor_name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 sm:px-6">
                          {getStatusBadge(ref.status)}
                        </td>

                        {/* Collection Method */}
                        <td className="py-4 px-4 sm:px-6 text-xs">
                          {method === "ADMIN_OFFICE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 border border-blue-100">
                              🏢 Admin Office
                            </span>
                          ) : method === "HEALTH_WORKER" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 font-semibold text-teal-700 border border-teal-100">
                              🩺 Health Worker
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Collected</span>
                          )}
                        </td>

                        {/* Collected By */}
                        <td className="py-4 px-4 sm:px-6 text-xs">
                          {ref.collected_by_name ? (
                            <span className="font-medium text-slate-900">
                              {ref.collected_by_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Collection Date */}
                        <td className="py-4 px-4 sm:px-6 text-xs text-slate-500 font-mono">
                          {formatDate(ref.collected_at)}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            {ref.status === "REVIEWED" ? (
                              <button
                                type="button"
                                onClick={() => openCollectModal(ref)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 transition"
                              >
                                <span>Collect Report</span>
                                <span>→</span>
                              </button>
                            ) : (
                              <Link
                                to={`/admin/referrals/${ref.id}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                              >
                                <span>View Details</span>
                                <span>→</span>
                              </Link>
                            )}
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

      {/* Collect Report Modal */}
      {collectModal.isOpen && collectModal.referral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-xl font-bold">
                  📥
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Collect Finalized Referral Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    Admin Office physical report handover & verification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCollectModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCollection} className="space-y-4">
              {/* Summary of Case */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Referral ID:</span>
                  <span className="font-mono font-bold text-slate-900">
                    #{collectModal.referral.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-semibold text-slate-900">
                    {collectModal.referral.patient_name || `Patient #${collectModal.referral.patient_id}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evaluating Specialist:</span>
                  <span className="font-semibold text-indigo-700">
                    Dr. {collectModal.referral.assigned_doctor_name || "Specialist"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AI Severity Diagnosis:</span>
                  <span>{getPredictionBadge(collectModal.referral.prediction)}</span>
                </div>
              </div>

              {/* Collection Method */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Collection Method
                </label>
                <input
                  type="text"
                  value="Admin Office Collection (ADMIN_OFFICE)"
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 cursor-not-allowed"
                />
              </div>

              {/* Collected By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Collected By (Logged-in Administrator)
                  </label>
                  <input
                    type="text"
                    value={
                      `${storedUser?.first_name || ""} ${storedUser?.last_name || ""}`.trim() ||
                      storedUser?.username ||
                      "Administrator"
                    }
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Collection Timestamp
                  </label>
                  <input
                    type="text"
                    value={new Date().toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }) + " (Current Time)"}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Administrative Notes / Remarks (Optional)
                </label>
                <textarea
                  value={collectModal.notes}
                  onChange={(e) =>
                    setCollectModal((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="e.g. Printed report handed directly to patient Aditya with specialist prescription."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3 text-xs outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setCollectModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  disabled={isCollecting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCollecting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isCollecting ? (
                    <>
                      <span className="animate-spin text-xs">🌀</span>
                      <span>Collecting...</span>
                    </>
                  ) : (
                    <span>Confirm Collection</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCollectionsPage;
