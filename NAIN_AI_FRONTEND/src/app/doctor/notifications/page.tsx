import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "../../../services/notifications";
import { useToast } from "../../../components/ToastProvider";

function DoctorNotificationsPage() {
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
      case "CASE_ASSIGNED":
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#354DAB] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        );
      case "CLINICAL_REVIEW_COMPLETED":
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case "REFERRAL_PENDING":
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A194E] tracking-tight">
            Specialist Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Stay updated with assigned patient referrals, clinical review requests, and report collection alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-[0.98] disabled:opacity-60"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Alerts</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm flex items-center justify-between"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-rose-900">Unable to load notifications</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadNotifications}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <section aria-label="Alert Counts" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab("ALL")}
          className={`rounded-2xl border p-5 bg-white shadow-sm transition cursor-pointer hover:shadow-md ${
            activeTab === "ALL" ? "border-[#354DAB] ring-1 ring-[#354DAB]/20" : "border-slate-200/80"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Alerts
          </span>
          <p className="text-3xl font-extrabold text-[#0A194E] mt-2">
            {summaryCounts.total}
          </p>
        </div>

        <div
          onClick={() => setActiveTab("UNREAD")}
          className={`rounded-2xl border p-5 bg-white shadow-sm transition cursor-pointer hover:shadow-md ${
            activeTab === "UNREAD" ? "border-blue-500 ring-2 ring-blue-500/15" : "border-blue-200"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-[#354DAB]">
            Unread Notifications
          </span>
          <p className="text-3xl font-extrabold text-[#354DAB] mt-2">
            {summaryCounts.unread}
          </p>
        </div>

        <div
          onClick={() => setActiveTab("READ")}
          className={`rounded-2xl border p-5 bg-white shadow-sm transition cursor-pointer hover:shadow-md ${
            activeTab === "READ" ? "border-emerald-500 ring-2 ring-emerald-500/15" : "border-emerald-200"
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Archived / Read
          </span>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">
            {summaryCounts.read}
          </p>
        </div>
      </section>

      {/* Filter Tabs & Mark All Read */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "ALL"
                ? "bg-[#354DAB] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({summaryCounts.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("UNREAD")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "UNREAD"
                ? "bg-[#354DAB] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unread ({summaryCounts.unread})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("READ")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "READ"
                ? "bg-[#354DAB] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Read ({summaryCounts.read})
          </button>
        </div>

        {summaryCounts.unread > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <svg className="w-3.5 h-3.5 text-[#354DAB]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-xs text-slate-400">
            <svg className="w-5 h-5 animate-spin text-[#354DAB] mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Loading specialist notifications...</span>
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#354DAB]">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No notifications found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {activeTab !== "ALL"
                ? `You have no ${activeTab.toLowerCase()} notifications.`
                : "You're all caught up! When referrals are assigned or reports are collected, notifications will appear here."}
            </p>
          </div>
        )}

        {!loading &&
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 transition shadow-sm cursor-pointer group ${
                !notif.is_read
                  ? "bg-white border-blue-200 hover:border-[#354DAB] hover:shadow-md"
                  : "bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3.5">
                {getNotifIcon(notif.type)}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm ${
                        !notif.is_read
                          ? "font-extrabold text-[#0A194E] group-hover:text-[#354DAB] transition-colors"
                          : "font-semibold text-slate-700"
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-[#354DAB] uppercase tracking-wider">
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

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm group-hover:border-[#354DAB] group-hover:text-[#354DAB] transition">
                  <span>Open Case</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default DoctorNotificationsPage;
