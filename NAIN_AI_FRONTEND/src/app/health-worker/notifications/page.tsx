import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "../../../services/notifications";
import { useToast } from "../../../components/ToastProvider";

function HealthWorkerNotificationsPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
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
        return "📦";
      case "REPORT_COLLECTED":
        return "🎉";
      case "REFERRAL_PENDING":
        return "📋";
      default:
        return "🔔";
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
              title="Health Worker Dashboard"
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
              to="/health-worker/dashboard"
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
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/health-worker/dashboard" className="hover:text-blue-600 transition">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">Notifications</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Field Notifications
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Stay updated with completed doctor evaluations and reports ready for collection.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/health-worker/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={loadNotifications}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              🔄 Refresh
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
              <span className="text-lg">⚠️</span>
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

        {/* Summary Cards */}
        <section aria-label="Notification Metrics">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Alerts
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {summaryCounts.total}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Ready for Collection / Unread
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
              ✓ Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              <span className="animate-spin inline-block mr-2">🌀</span> Loading notifications...
            </div>
          )}

          {!loading && filteredNotifications.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                📦
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
                  <span className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                    Collect Report →
                  </span>
                </div>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}

export default HealthWorkerNotificationsPage;
