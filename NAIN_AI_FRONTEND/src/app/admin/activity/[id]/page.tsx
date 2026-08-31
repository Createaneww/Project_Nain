import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import {
  fetchActivityLogById,
  type ActivityLogItem,
} from "../../../../services/activity";

function AdminActivityDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const storedUser = getStoredUser();

  const [activity, setActivity] = useState<ActivityLogItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const data = await fetchActivityLogById(id);
      setActivity(data);
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
        setError("Unable to load activity log details. Please try again.");
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

  // Format event title
  const formatEventName = (eventType: string): string => {
    return eventType
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Role Badge Styling
  const getRoleBadge = (role?: string) => {
    const r = (role || "").toUpperCase();
    switch (r) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
            Administrator
          </span>
        );
      case "DOCTOR":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            Doctor
          </span>
        );
      case "HEALTH_WORKER":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            Health Worker
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            {r || "System"}
          </span>
        );
    }
  };

  // Category Badge Styling
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "PATIENT":
        return (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            👤 Patient
          </span>
        );
      case "SCREENING":
        return (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            👁️ Screening
          </span>
        );
      case "AI_ANALYSIS":
        return (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            🤖 AI Analysis
          </span>
        );
      case "REFERRAL":
        return (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            📋 Referral
          </span>
        );
      case "CLINICAL_EVALUATION":
        return (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200">
            🩺 Clinical Review
          </span>
        );
      case "COLLECTION":
        return (
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            📦 Collection
          </span>
        );
      case "USER_MANAGEMENT":
        return (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
            🛡️ User Management
          </span>
        );
      case "AUTH":
      default:
        return (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            🔑 Authentication
          </span>
        );
    }
  };

  // Contextual link generator
  const getContextualAction = () => {
    if (!activity) return null;
    const type = activity.entity_type?.toLowerCase();
    const id = activity.entity_id;

    if (!type || !id) return null;

    if (type.includes("patient") || activity.patient_id) {
      const pid = activity.patient_id || id;
      return (
        <Link
          to={`/admin/patients/${pid}`}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition inline-flex items-center gap-1.5"
        >
          <span>👤 View Patient #{pid}</span>
          <span>→</span>
        </Link>
      );
    }

    if (type.includes("screening")) {
      return (
        <Link
          to={`/admin/screenings/${id}`}
          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 shadow-sm hover:bg-blue-100 transition inline-flex items-center gap-1.5"
        >
          <span>👁️ View Screening #{id}</span>
          <span>→</span>
        </Link>
      );
    }

    if (type.includes("referral")) {
      return (
        <Link
          to={`/admin/referrals/${id}`}
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-800 shadow-sm hover:bg-indigo-100 transition inline-flex items-center gap-1.5"
        >
          <span>📋 View Referral #{id}</span>
          <span>→</span>
        </Link>
      );
    }

    if (type.includes("report")) {
      return (
        <Link
          to={`/admin/reports/${id}`}
          className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-800 shadow-sm hover:bg-purple-100 transition inline-flex items-center gap-1.5"
        >
          <span>📊 View Report #{id}</span>
          <span>→</span>
        </Link>
      );
    }

    if (type.includes("user")) {
      return (
        <Link
          to={`/admin/users/${id}`}
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-800 shadow-sm hover:bg-rose-100 transition inline-flex items-center gap-1.5"
        >
          <span>🛡️ View User #{id}</span>
          <span>→</span>
        </Link>
      );
    }

    return null;
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
              to="/admin/activity"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Activity Log
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/admin/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/admin/activity" className="hover:text-blue-600 transition">
            Activity Log
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Activity #{id}</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Activity Event Details
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Audit log verification and record trail.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/activity"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Activity Log
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

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-pulse space-y-4">
            <div className="h-6 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-64 bg-slate-100 rounded"></div>
            <div className="h-36 bg-slate-100 rounded-xl"></div>
          </div>
        )}

        {/* Not Found */}
        {!loading && isNotFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
              📋
            </div>
            <h2 className="text-lg font-semibold text-slate-800">
              Activity log not found
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              No audit activity log exists with ID #{id}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/admin/activity"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Return to Activity Log
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && !isNotFound && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
            <p className="font-semibold text-red-900">
              Unable to load activity log
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

        {/* Loaded Activity Record */}
        {!loading && !error && activity && (
          <div className="space-y-6">
            {/* Overview Banner Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold text-slate-700 border border-slate-200">
                    📋
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">
                        {formatEventName(activity.event_type)}
                      </h2>
                      {getCategoryBadge(activity.category)}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Event Code: <span className="font-semibold text-slate-600">{activity.event_type}</span> • Activity #{activity.id}
                    </p>
                  </div>
                </div>

                <div>
                  {getContextualAction()}
                </div>
              </div>

              {/* Event Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                  <span className="text-slate-500 font-medium block">Timestamp</span>
                  <span className="font-bold text-slate-900 font-mono text-sm block">
                    {formatDate(activity.created_at)}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                  <span className="text-slate-500 font-medium block">Actor / User</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {activity.actor_name}
                    </span>
                    {getRoleBadge(activity.actor_role)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                  <span className="text-slate-500 font-medium block">Related Entity</span>
                  <span className="font-bold text-slate-900 font-mono text-sm block">
                    {activity.entity_type ? `${activity.entity_type} #${activity.entity_id || "—"}` : "— None"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 space-y-1">
                  <span className="text-slate-500 font-medium block">Related Patient</span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {activity.patient_name ? (
                      `${activity.patient_name} (ID #${activity.patient_id})`
                    ) : (
                      <span className="text-slate-400 font-normal italic">— None</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Human-Readable Details */}
              <div className="mt-6 rounded-xl bg-white p-5 border border-slate-200 text-sm text-slate-800 leading-relaxed">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Event Description & Summary:
                </span>
                {activity.details}
              </div>

              {/* Metadata Details (if present) */}
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Additional Event Metadata:
                  </span>
                  <pre className="overflow-x-auto bg-white p-3 rounded-lg border border-slate-200 font-mono text-slate-800 text-[11px]">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminActivityDetailPage;
