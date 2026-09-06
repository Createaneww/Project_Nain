import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../../../services/auth";
import {
  fetchHealthWorkerDashboard,
  type HealthWorkerDashboardData,
} from "../../../services/dashboard";
import { fetchScreenings, type Screening } from "../../../services/screenings";
import { fetchPatients } from "../../../services/patients";

function HealthWorkerDashboardPage() {
  const storedUser = getStoredUser();

  const [dashboardData, setDashboardData] = useState<HealthWorkerDashboardData | null>(null);
  const [recentScreenings, setRecentScreenings] = useState<Screening[]>([]);
  const [totalPatientsCount, setTotalPatientsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashRes, screeningsRes, patientsRes] = await Promise.allSettled([
        fetchHealthWorkerDashboard(),
        fetchScreenings(),
        fetchPatients(),
      ]);

      if (dashRes.status === "fulfilled") {
        setDashboardData(dashRes.value);
      } else {
        throw new Error(dashRes.reason?.message || "Failed to load dashboard metrics.");
      }

      if (screeningsRes.status === "fulfilled" && Array.isArray(screeningsRes.value)) {
        const sorted = [...screeningsRes.value].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentScreenings(sorted.slice(0, 5));
      }

      if (patientsRes.status === "fulfilled" && Array.isArray(patientsRes.value)) {
        setTotalPatientsCount(patientsRes.value.length);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const displayName =
    dashboardData?.health_worker?.full_name ||
    storedUser?.first_name ||
    storedUser?.username ||
    "Health Worker";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Analyzing
          </span>
        );
      case "IMAGE_UPLOADED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Uploaded
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {status || "Created"}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════════
          1. WELCOME BANNER & PRIMARY ACTION
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3F54DA] tracking-wider uppercase">
              Field Operations Overview
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            {getGreeting()}, {displayName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor diabetic retinopathy screenings, register patients, and track clinical referrals.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/health-worker/patients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3F54DA] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-[#3F54DA]/20 hover:shadow-lg hover:shadow-[#3F54DA]/30 transition duration-150 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Register Patient</span>
          </Link>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ERROR STATE
      ════════════════════════════════════════════════════════════════ */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Failed to load dashboard data</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAllData}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          2. COMPACT KPI / OVERVIEW SECTION (4 Metrics in a row)
      ════════════════════════════════════════════════════════════════ */}
      <section aria-label="KPI Overview">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* KPI 1: Total Screenings */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Screenings
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-2.5">
              {loading ? (
                <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl sm:text-3xl font-extrabold text-[#0F1F5C] tracking-tight">
                  {dashboardData?.screenings?.total ?? 0}
                </p>
              )}
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">All-time screenings</p>
            </div>
          </div>

          {/* KPI 2: Today's Screenings */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Today's Screenings
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-2.5">
              {loading ? (
                <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {dashboardData?.screenings?.today ?? 0}
                </p>
              )}
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Completed today</p>
            </div>
          </div>

          {/* KPI 3: Referrals Collected */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Referrals Collected
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-2.5">
              {loading ? (
                <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {dashboardData?.referrals_collected?.total ?? 0}
                </p>
              )}
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Doctor-reviewed cases</p>
            </div>
          </div>

          {/* KPI 4: Registered Patients */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Patients
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-2.5">
              {loading ? (
                <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {totalPatientsCount !== null ? totalPatientsCount : "—"}
                </p>
              )}
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">In health directory</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          3. PRIMARY WORKSPACE (2-COLUMN: PRIMARY ACTION + QUICK ACTIONS)
      ════════════════════════════════════════════════════════════════ */}
      <section aria-label="Clinical Workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT — PRIMARY ACTION (Start New Screening) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#0F1F5C] via-[#102A7A] to-[#1D4ED8] text-white p-5 sm:p-6 lg:p-7 rounded-2xl shadow-lg shadow-blue-950/20 flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle background optics watermark */}
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-10 translate-x-8 translate-y-8">
            <svg width="240" height="240" viewBox="0 0 200 200" fill="none">
              <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="2" strokeDasharray="4 8" />
              <circle cx="100" cy="100" r="50" stroke="white" strokeWidth="3" />
              <circle cx="100" cy="100" r="20" fill="white" />
            </svg>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-blue-200 mb-3.5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Core AI Screening Workflow
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              Screen a Patient for Diabetic Retinopathy
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-lg">
              Upload patient retinal fundus photographs and execute automated AI grading with explainable heatmap visualization and clinical severity staging.
            </p>
          </div>

          <div className="mt-5 pt-5 sm:mt-6 sm:pt-6 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-blue-200 font-medium">
              <svg className="w-4 h-4 text-blue-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Ready for image capture & upload</span>
            </div>

            <Link
              to="/health-worker/screenings/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-white text-[#0F1F5C] hover:bg-blue-50 font-bold text-xs sm:text-sm transition duration-150 shadow-md shadow-black/10 active:scale-[0.98] shrink-0"
            >
              <span>Start Screening</span>
              <svg className="w-4 h-4 text-[#3F54DA] transition-transform duration-150 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* RIGHT — SECONDARY QUICK ACTIONS (2x2 Compact Grid) */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Quick Action 1: Patients Directory */}
          <Link
            to="/health-worker/patients"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#3F54DA] hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#3F54DA] transition-colors">
                Patients Directory
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Search, view, and manage registered patient records.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-[#3F54DA] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              View Directory &rarr;
            </span>
          </Link>

          {/* Quick Action 2: Add New Patient */}
          <Link
            to="/health-worker/patients/new"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#3F54DA] hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#3F54DA] transition-colors">
                Add New Patient
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Create a new patient profile before initial screening.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-[#3F54DA] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Register &rarr;
            </span>
          </Link>

          {/* Quick Action 3: All Screenings & AI */}
          <Link
            to="/health-worker/screenings"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#3F54DA] hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#3F54DA] transition-colors">
                Screenings & AI
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Browse all past screening sessions & AI predictions.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-[#3F54DA] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              All Screenings &rarr;
            </span>
          </Link>

          {/* Quick Action 4: Referral Collection */}
          <Link
            to="/health-worker/referrals"
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#3F54DA] hover:shadow-md transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#3F54DA] transition-colors">
                Referral Collection
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Collect validated medical reports after specialist review.
              </p>
            </div>
            <span className="mt-3 text-xs font-semibold text-[#3F54DA] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Track Referrals &rarr;
            </span>
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          4. SCREENING WORKFLOW STEPPER
      ════════════════════════════════════════════════════════════════ */}
      <section aria-label="Screening Workflow" className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0F1F5C]">
              End-to-End Clinical Screening Workflow
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard 5-stage protocol for field-level AI-assisted Diabetic Retinopathy screening
            </p>
          </div>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#3F54DA] tracking-wider uppercase">Stage 01</span>
              <div className="w-5 h-5 rounded-full bg-blue-100 text-[#3F54DA] flex items-center justify-center text-[10px] font-bold">
                1
              </div>
            </div>
            <h5 className="text-xs font-bold text-slate-900 leading-snug">Select Patient</h5>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Find patient record or register a new profile.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#3F54DA] tracking-wider uppercase">Stage 02</span>
              <div className="w-5 h-5 rounded-full bg-blue-100 text-[#3F54DA] flex items-center justify-center text-[10px] font-bold">
                2
              </div>
            </div>
            <h5 className="text-xs font-bold text-slate-900 leading-snug">Fundus Capture</h5>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Capture & upload fundus photograph.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#3F54DA] tracking-wider uppercase">Stage 03</span>
              <div className="w-5 h-5 rounded-full bg-blue-100 text-[#3F54DA] flex items-center justify-center text-[10px] font-bold">
                3
              </div>
            </div>
            <h5 className="text-xs font-bold text-slate-900 leading-snug">AI Screening</h5>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Automated grading & Grad-CAM heatmap.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#3F54DA] tracking-wider uppercase">Stage 04</span>
              <div className="w-5 h-5 rounded-full bg-blue-100 text-[#3F54DA] flex items-center justify-center text-[10px] font-bold">
                4
              </div>
            </div>
            <h5 className="text-xs font-bold text-slate-900 leading-snug">Doctor Review</h5>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Ophthalmologist validates diagnosis.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-[#3F54DA] tracking-wider uppercase">Stage 05</span>
              <div className="w-5 h-5 rounded-full bg-blue-100 text-[#3F54DA] flex items-center justify-center text-[10px] font-bold">
                5
              </div>
            </div>
            <h5 className="text-xs font-bold text-slate-900 leading-snug">Collect Report</h5>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Deliver final referral report to patient.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          5. RECENT ACTIVITY / SCREENINGS TABLE
      ════════════════════════════════════════════════════════════════ */}
      <section aria-label="Recent Activity" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0F1F5C]">
              Recent Screening Activity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest screening records registered on this terminal
            </p>
          </div>

          <Link
            to="/health-worker/screenings"
            className="text-xs font-semibold text-[#3F54DA] hover:text-blue-800 transition"
          >
            View All Screenings &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <svg className="w-6 h-6 animate-spin text-[#3F54DA] mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs font-medium">Loading recent cases...</span>
          </div>
        ) : recentScreenings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5 sm:px-6">Screening ID</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-5 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {recentScreenings.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5 sm:px-6 font-mono font-bold text-[#0F1F5C]">
                      #{sc.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {sc.patient_name || `Patient #${sc.patient}`}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(sc.status)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDate(sc.created_at)}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        {sc.status === "COMPLETED" && sc.report_id && (
                          <Link
                            to={`/health-worker/reports/${sc.report_id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white transition"
                          >
                            <span>Report</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </Link>
                        )}
                        <Link
                          to={`/health-worker/screenings/${sc.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-[#3F54DA] hover:text-blue-800 transition"
                        >
                          <span>Open</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#3F54DA] border border-blue-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-800">No recent screening activity</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You haven't conducted any screenings today. Start a new screening session with an existing or new patient.
            </p>
            <div className="mt-4">
              <Link
                to="/health-worker/screenings/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
              >
                <span>Start First Screening</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default HealthWorkerDashboardPage;
