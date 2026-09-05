import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "../../../services/notifications";
import { useToast } from "../../../components/ToastProvider";

function HealthWorkerNotificationsPage() {
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
      case "REPORT_READY_FOR_COLLECTION":
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        );
      case "REPORT_COLLECTED":
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.09 1.976 1.053 1.976 2.188V18.75a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 18.75V6.108c0-1.135.845-2.098 1.976-2.188.374-.03.748-.057 1.124-.08" />
            </svg>
          </div>
        );
      case "REFERRAL_PENDING":
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1F5C]">Field Notifications</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Stay updated with completed doctor evaluations and reports ready for collection.</p>
        </div>
        <button
          type="button"
          onClick={loadNotifications}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm flex items-center justify-between"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-rose-900">
                Unable to load notifications
              </p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadNotifications}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <section aria-label="Notification Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Alerts
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-[#0F1F5C] mt-1">
              {summaryCounts.total}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200/80 bg-white p-4 sm:p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#3F54DA]">
              Ready for Collection / Unread
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-[#3F54DA] mt-1">
              {summaryCounts.unread}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 sm:p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Read Notifications
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">
              {summaryCounts.read}
            </p>
          </div>
        </div>
      </section>

      {/* Tab Controls & Mark All Read */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "ALL"
                ? "bg-[#3F54DA] text-white shadow-sm shadow-[#3F54DA]/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            All ({summaryCounts.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("UNREAD")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "UNREAD"
                ? "bg-[#3F54DA] text-white shadow-sm shadow-[#3F54DA]/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Unread ({summaryCounts.unread})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("READ")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === "READ"
                ? "bg-[#3F54DA] text-white shadow-sm shadow-[#3F54DA]/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Read ({summaryCounts.read})
          </button>
        </div>

        {summaryCounts.unread > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Mark All as Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-sm text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin text-[#3F54DA]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading notifications...</span>
            </div>
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No notifications found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {activeTab !== "ALL"
                ? `You have no ${activeTab.toLowerCase()} notifications.`
                : "You're all caught up! Once doctor reviews are completed, collection alerts will appear here."}
            </p>
          </div>
        )}

        {!loading &&
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition shadow-sm cursor-pointer ${
                !notif.is_read
                  ? "bg-white border-blue-200 hover:border-[#3F54DA] hover:shadow-md"
                  : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3.5 sm:gap-4">
                {getNotifIcon(notif.type)}

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs sm:text-sm ${
                        !notif.is_read
                          ? "font-bold text-[#0F1F5C]"
                          : "font-semibold text-slate-700"
                      }`}
                    >
                      {notif.title}
                    </h4>
                    {!notif.is_read && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#3F54DA]">
                        READY
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
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  <span>Collect Report</span>
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default HealthWorkerNotificationsPage;
