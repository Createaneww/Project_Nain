import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "../../../services/notifications";
import { useToast } from "../../../components/ToastProvider";

function AdminNotificationsPage() {
  const navigate = useNavigate();
  const { success } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter: ALL | UNREAD | READ
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "READ">("ALL");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to load notifications. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

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

  // Metrics
  const summaryCounts = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.is_read).length;
    const read = notifications.filter((n) => n.is_read).length;
    return { total, unread, read };
  }, [notifications]);

  // Filtered List
  const filteredNotifications = useMemo(() => {
    if (activeTab === "UNREAD") {
      return notifications.filter((n) => !n.is_read);
    }
    if (activeTab === "READ") {
      return notifications.filter((n) => n.is_read);
    }
    return notifications;
  }, [notifications, activeTab]);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // Continue
      }
    }
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      success("All notifications marked as read.");
    } catch {
      // Ignore
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "REFERRAL_PENDING":
        return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>);
      case "CASE_ASSIGNED":
        return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" /></svg>);
      case "CLINICAL_REVIEW_COMPLETED":
        return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
      case "REPORT_READY_FOR_COLLECTION":
        return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>);
      case "REPORT_COLLECTED":
        return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
      default:
        return (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#354DAB] uppercase tracking-wider bg-[#E8F2FE] px-2.5 py-0.5 rounded-full">
              System Dispatch
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {summaryCounts.unread} Unread Notifications
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Notifications Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Stay updated with important clinical workflow and administrative activities.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadNotifications}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#354DAB] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-[#2A3E8C] transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

        {/* Error Alert */}
        {error && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <div>
                <p className="font-semibold text-red-900">
                  Unable to load notifications
                </p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadNotifications}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards (3 Cards) */}
        <section aria-label="Notification Metrics">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Notifications
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {summaryCounts.total}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Unread Notifications
              </span>
              <p className="text-2xl font-bold text-blue-700 mt-2">
                {summaryCounts.unread}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Read Notifications
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-2">
                {summaryCounts.read}
              </p>
            </div>
          </div>
        </section>

        {/* Tab Controls & Mark All Read */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === "ALL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({summaryCounts.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("UNREAD")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === "UNREAD"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Unread ({summaryCounts.unread})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("READ")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === "READ"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Read ({summaryCounts.read})
            </button>
          </div>

          {summaryCounts.unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg> Loading notifications...
            </div>
          )}

          {!loading && filteredNotifications.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No notifications found
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab !== "ALL"
                  ? `You have no ${activeTab.toLowerCase()} notifications.`
                  : "You're all caught up! New workflow alerts will appear here."}
              </p>
            </div>
          )}

          {!loading &&
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 transition shadow-sm cursor-pointer ${
                  !notif.is_read
                    ? "bg-white border-blue-200 hover:border-blue-400 hover:shadow-md"
                    : "bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 text-2xl shadow-sm">
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm ${
                          !notif.is_read
                            ? "font-bold text-slate-900"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.is_read && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {notif.message}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {formatDate(notif.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    View →
                  </span>
                </div>
              </div>
            ))}
        </div>
    </div>
  );
}

export default AdminNotificationsPage;
