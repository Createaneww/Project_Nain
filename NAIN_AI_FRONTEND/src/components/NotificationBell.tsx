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
        return "📋";
      case "CASE_ASSIGNED":
        return "🩺";
      case "CLINICAL_REVIEW_COMPLETED":
        return "✅";
      case "REPORT_READY_FOR_COLLECTION":
        return "📦";
      case "REPORT_COLLECTED":
        return "🎉";
      default:
        return "🔔";
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
        <span className="text-base">🔔</span>
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
              <div className="py-8 text-center text-xs text-slate-400">
                <span className="animate-spin inline-block mr-1">🌀</span> Loading notifications...
              </div>
            )}

            {!loading && recentNotifications.length === 0 && (
              <div className="py-8 text-center">
                <span className="text-2xl block mb-1">🔕</span>
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-base shadow-sm">
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
