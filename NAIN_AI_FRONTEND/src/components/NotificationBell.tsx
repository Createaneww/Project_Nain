import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
} from "../services/notifications";
import { useToast } from "./ToastProvider";

interface NotificationBellProps {
  role: "ADMIN" | "DOCTOR" | "HEALTH_WORKER";
}

export default function NotificationBell({ role }: NotificationBellProps) {
  const navigate = useNavigate();
  const { success } = useToast();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<
    AppNotification[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const viewAllUrl =
    role === "ADMIN"
      ? "/admin/notifications"
      : role === "DOCTOR"
      ? "/doctor/notifications"
      : "/health-worker/notifications";

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Ignore network failure on background poll
    }
  }, []);

  const loadRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNotifications();
      setRecentNotifications(list.slice(0, 6));
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // 30s background sync
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      loadRecentNotifications();
      loadUnreadCount();
    }
  }, [isOpen, loadRecentNotifications, loadUnreadCount]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // Continue navigation
      }
    }
    setIsOpen(false);
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      success("All notifications marked as read.");
    } catch {
      // Ignore
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "REFERRAL_PENDING":
        return (
          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case "CASE_ASSIGNED":
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14v1a7 7 0 01-14 0v-1M5 14V6a3 3 0 016 0v1M19 14V6a3 3 0 00-6 0v1M12 21a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        );
      case "CLINICAL_REVIEW_COMPLETED":
        return (
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "REPORT_READY_FOR_COLLECTION":
        return (
          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case "REPORT_COLLECTED":
        return (
          <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        );
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100"
        title="Notifications"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white p-3 shadow-2xl border border-slate-200 z-50 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-2.5">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 py-1">
            {loading && recentNotifications.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span>Loading notifications...</span>
              </div>
            )}

            {!loading && recentNotifications.length === 0 && (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m3.844-.148a23.856 23.856 0 005.455-1.31 8.964 8.964 0 002.3-5.542m-4.25-4.25a8.963 8.963 0 00-6.336-2.23V3a3 3 0 00-3 3v.75a8.967 8.967 0 00-2.312 6.022c.205 1.343.682 2.593 1.378 3.693M3 3l18 18" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-slate-600">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You will see workflow updates here.
                </p>
              </div>
            )}

            {recentNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition ${
                  !n.is_read
                    ? "bg-blue-50/50 hover:bg-blue-50"
                    : "hover:bg-slate-50 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
                  {getNotifIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-xs truncate ${
                        !n.is_read
                          ? "font-bold text-slate-900"
                          : "font-semibold text-slate-700"
                      }`}
                    >
                      {n.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {formatTimeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                    {n.message}
                  </p>
                </div>

                {!n.is_read && (
                  <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-2 px-1 text-center">
            <Link
              to={viewAllUrl}
              onClick={() => setIsOpen(false)}
              className="block w-full rounded-xl bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              View All Notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
