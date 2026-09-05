import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { logout, getStoredUser } from "../services/auth";
import NotificationBell from "./NotificationBell";

export default function HealthWorkerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = getStoredUser();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    storedUser?.first_name ||
    storedUser?.username ||
    "Health Worker";

  // Navigation Items Definition
  const navItems = [
    {
      label: "Dashboard",
      path: "/health-worker/dashboard",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      isActive: (currentPath: string) => currentPath === "/health-worker/dashboard",
    },
    {
      label: "Patients",
      path: "/health-worker/patients",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      isActive: (currentPath: string) => currentPath.startsWith("/health-worker/patients"),
    },
    {
      label: "Screenings & AI",
      path: "/health-worker/screenings",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      isActive: (currentPath: string) =>
        currentPath.startsWith("/health-worker/screenings") || currentPath.startsWith("/health-worker/reports"),
    },
    {
      label: "Referrals",
      path: "/health-worker/referrals",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      isActive: (currentPath: string) => currentPath.startsWith("/health-worker/referrals"),
    },
    {
      label: "Notifications",
      path: "/health-worker/notifications",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      isActive: (currentPath: string) => currentPath.startsWith("/health-worker/notifications"),
    },
  ];

  // Dynamic Breadcrumb Generator
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.includes("/patients/new")) {
      return { section: "Patients", current: "Register New Patient" };
    }
    if (path.includes("/patients/") && path.includes("/screening")) {
      return { section: "Patients", current: "New Screening" };
    }
    if (path.match(/\/patients\/\d+/)) {
      return { section: "Patients", current: "Patient Details" };
    }
    if (path === "/health-worker/patients") {
      return { section: "Health Worker Portal", current: "Patients Directory" };
    }
    if (path.includes("/screenings/new")) {
      return { section: "Screenings & AI", current: "Start New Screening" };
    }
    if (path.includes("/screenings/") && path.includes("/upload")) {
      return { section: "Screenings & AI", current: "Upload Fundus Image" };
    }
    if (path.match(/\/screenings\/\d+/)) {
      return { section: "Screenings & AI", current: "Screening Session" };
    }
    if (path.includes("/reports/")) {
      return { section: "Screenings & AI", current: "Clinical AI Report" };
    }
    if (path === "/health-worker/screenings") {
      return { section: "Health Worker Portal", current: "Screenings & AI" };
    }
    if (path.match(/\/referrals\/\d+/)) {
      return { section: "Referrals", current: "Referral Case Review" };
    }
    if (path === "/health-worker/referrals") {
      return { section: "Health Worker Portal", current: "Referral Collection" };
    }
    if (path === "/health-worker/notifications") {
      return { section: "Health Worker Portal", current: "Notifications" };
    }
    return { section: "Health Worker Portal", current: "Operations Dashboard" };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800 antialiased"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* ════════════════════════════════════════════════════════════════
          MOBILE DRAWER BACKDROP
      ════════════════════════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ════════════════════════════════════════════════════════════════
          PERSISTENT FIXED DARK NAVY SIDEBAR
      ════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col h-screen overflow-hidden bg-[#0A194E] border-r border-[#152B75] text-white transition-all duration-300 ease-in-out shrink-0 ${
          mobileMenuOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        } ${sidebarCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#152B75] shrink-0">
          <Link
            to="/health-worker/dashboard"
            className={`flex items-center gap-3 overflow-hidden transition-all group ${
              sidebarCollapsed ? "lg:justify-center lg:w-full" : ""
            }`}
          >
            {/* Logo Mark */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1D4ED8] to-[#3F54DA] text-white shadow-md shadow-blue-950/60 border border-blue-400/20 group-hover:scale-105 transition-transform">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12C2 12 5.5 6 12 6C18.5 6 22 12 22 12C22 12 18.5 18 12 18C5.5 18 2 12 2 12Z"
                  stroke="#93C5FD"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="3.5" stroke="#BFDBFE" strokeWidth="1.75" />
                <circle cx="12" cy="12" r="1.2" fill="#FFFFFF" />
              </svg>
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-white tracking-tight">NAIN AI</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#3F54DA]/30 text-blue-200 border border-blue-400/30 uppercase">
                    DR
                  </span>
                </div>
                <span className="text-[10px] text-blue-200/70 font-semibold tracking-wider uppercase truncate">
                  Field Operations
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-blue-200/60 hover:text-white hover:bg-white/10 transition"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Mobile Drawer Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className={`px-3 py-2 text-[10px] font-bold text-blue-300/50 uppercase tracking-wider ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            Main Menu
          </div>

          {navItems.map((item) => {
            const active = item.isActive(location.pathname);
            return (
              <Link
                key={item.label}
                to={item.path}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-[#3F54DA] text-white shadow-md shadow-[#3F54DA]/30 font-bold"
                    : "text-blue-100/75 hover:bg-white/10 hover:text-white"
                } ${sidebarCollapsed ? "lg:justify-center lg:px-2" : ""}`}
              >
                {item.icon}
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Account Footer in Sidebar */}
        <div className="p-3 border-t border-[#152B75] bg-[#07133D]/60 shrink-0 space-y-1.5">
          {/* User Profile Card */}
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] ${sidebarCollapsed ? "lg:justify-center lg:p-1.5" : ""}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3F54DA] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-blue-300/20">
              {displayName.charAt(0).toUpperCase()}
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-blue-200/70 font-medium truncate">Field Health Worker</p>
              </div>
            )}
          </div>

          {/* Logout Action directly under profile */}
          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-blue-200/80 hover:bg-rose-500/15 hover:text-rose-300 active:scale-[0.98] transition-all duration-150 group ${
              sidebarCollapsed ? "lg:justify-center lg:px-2" : ""
            }`}
          >
            <svg
              className="w-5 h-5 shrink-0 text-blue-200/70 group-hover:text-rose-300 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span className="truncate">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          MAIN VIEWPORT CONTAINER (Adjusts to fixed sidebar)
      ════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen w-full transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Global Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Open Navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumbs & Page Context */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                {breadcrumbs.section}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="text-sm sm:text-base font-bold text-[#0A194E] tracking-tight">
                {breadcrumbs.current}
              </h1>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bell Dropdown */}
            <NotificationBell role="HEALTH_WORKER" />

            {/* User Details Pill */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-500 font-medium">Field Health Worker</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#3F54DA] border border-blue-200/80 flex items-center justify-center font-bold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Outlet with Smooth Transition */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
