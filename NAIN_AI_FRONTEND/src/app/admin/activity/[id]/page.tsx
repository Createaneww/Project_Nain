import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchActivityLogById,
  type ActivityLogItem,
} from "../../../../services/activity";

function AdminActivityDetailPage() {
  const { id } = useParams<{ id: string }>();

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
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> Patient</span>
          </span>
        );
      case "SCREENING":
        return (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Screening</span>
          </span>
        );
      case "AI_ANALYSIS":
        return (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg> AI Analysis</span>
          </span>
        );
      case "REFERRAL":
        return (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Referral</span>
          </span>
        );
      case "CLINICAL_EVALUATION":
        return (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200">
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg> Clinical Review</span>
          </span>
        );
      case "COLLECTION":
        return (
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> Collection</span>
          </span>
        );
      case "USER_MANAGEMENT":
        return (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> User Management</span>
          </span>
        );
      case "AUTH":
      default:
        return (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <span className="inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg> Authentication</span>
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
          <span className="flex items-center gap-1.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> View Patient #{pid}</span>
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
          <span className="flex items-center gap-1.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> View Screening #{id}</span>
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
          <span className="flex items-center gap-1.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> View Referral #{id}</span>
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
          <span className="flex items-center gap-1.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> View Report #{id}</span>
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
          <span className="flex items-center gap-1.5"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg> View User #{id}</span>
          <span>→</span>
        </Link>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              Audit Record
            </span>
            <span className="text-xs text-slate-400 font-mono">Event #{id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Activity Event Details
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit log verification and record trail.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/activity"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All Activity
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
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
    </div>
  );
}

export default AdminActivityDetailPage;
