import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";
import {
  fetchHealthWorkerDashboard,
  type HealthWorkerDashboardData,
} from "../../../services/dashboard";

function HealthWorkerDashboardPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [data, setData] = useState<HealthWorkerDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHealthWorkerDashboard();
      setData(result);
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
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    data?.health_worker?.full_name ||
    storedUser?.first_name ||
    storedUser?.username ||
    "Health Worker";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20">
              👁️
            </div>
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
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{displayName}</p>
              <p className="text-xs text-slate-500">Field Health Worker</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Health Worker Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Welcome back, <span className="font-semibold text-slate-700">{displayName}</span>. Monitor your screenings, register patients, and track referrals.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="h-4 w-24 rounded bg-slate-200"></div>
                  <div className="mt-4 h-8 w-16 rounded bg-slate-300"></div>
                  <div className="mt-2 h-3 w-32 rounded bg-slate-200"></div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center py-12 text-slate-400">
              <svg
                className="h-6 w-6 animate-spin text-blue-600 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              <span>Loading dashboard metrics...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-900">
                    Failed to load dashboard metrics
                  </h3>
                  <p className="mt-0.5 text-sm text-red-700">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Data Display */}
        {!loading && data && (
          <div className="space-y-8">
            {/* Metric Cards Grid */}
            <section aria-label="Summary Statistics">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Total Screenings */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Total Screenings
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
                      📸
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-slate-900">
                      {data.screenings.total}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      All-time screenings performed by you
                    </p>
                  </div>
                </div>

                {/* Today's Screenings */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Today's Screenings
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                      📅
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-slate-900">
                      {data.screenings.today}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Screenings created today
                    </p>
                  </div>
                </div>

                {/* Referrals Collected */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      Referrals Collected
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
                      📁
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-slate-900">
                      {data.referrals_collected.total}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Completed reports collected after doctor review
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions Grid */}
            <section aria-label="Quick Actions">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Search Patients */}
                <Link
                  to="/health-worker/patients"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
                >
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 text-lg group-hover:scale-105 transition-transform">
                      🔍
                    </div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Patients List
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Search, view, and select registered patients.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center text-xs font-semibold text-blue-600">
                    View Patients →
                  </span>
                </Link>

                {/* Add New Patient */}
                <Link
                  to="/health-worker/patients/new"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                >
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-lg group-hover:scale-105 transition-transform">
                      ➕
                    </div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      Add New Patient
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Register a new patient record into the system.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center text-xs font-semibold text-emerald-600">
                    Register Patient →
                  </span>
                </Link>

                {/* Start Screening & Image Analysis */}
                <Link
                  to="/health-worker/screenings"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
                >
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-lg group-hover:scale-105 transition-transform">
                      👁️
                    </div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Screenings & AI
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload fundus images & run explainable AI analysis.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center text-xs font-semibold text-blue-600">
                    Open Screenings →
                  </span>
                </Link>

                {/* View Referrals */}
                <Link
                  to="/health-worker/referrals"
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-400 hover:shadow-md"
                >
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-lg group-hover:scale-105 transition-transform">
                      📋
                    </div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-purple-600 transition-colors">
                      Referral Collection
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Track reviewed cases and collect finalized results.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center text-xs font-semibold text-purple-600">
                    Track Referrals →
                  </span>
                </Link>
              </div>
            </section>

            {/* Screening Workflow Steps Guide */}
            <section
              aria-label="Workflow Guide"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">
                End-to-End Screening Workflow
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Follow these steps to conduct an AI-assisted diabetic retinopathy screening:
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Select or Add Patient
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Find existing patient or register new profile.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Upload Fundus Image
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload captured retinal eye fundus image.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Run AI Analysis
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ML model evaluates quality, DR stage & Grad-CAM.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    4
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Doctor Review & Collect
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Doctor adds notes and Health Worker collects report.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default HealthWorkerDashboardPage;
