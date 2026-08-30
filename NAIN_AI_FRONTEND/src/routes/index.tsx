import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../app/login/page";
import AdminDashboardPage from "../app/admin/dashboard/page";
import DoctorDashboardPage from "../app/doctor/dashboard/page";
import HealthWorkerDashboardPage from "../app/health-worker/dashboard/page";
import HealthWorkerPatientsPage from "../app/health-worker/patients/page";
import HealthWorkerNewPatientPage from "../app/health-worker/patients/new/page";
import HealthWorkerPatientDetailPage from "../app/health-worker/patients/[id]/page";
import HealthWorkerScreeningsPage from "../app/health-worker/screenings/page";
import HealthWorkerNewScreeningPage from "../app/health-worker/screenings/new/page";
import HealthWorkerReferralsPage from "../app/health-worker/referrals/page";
import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Dashboard Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Doctor Dashboard Routes */}
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR"]}>
              <DoctorDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Health Worker Dashboard & Workflow Routes */}
        <Route
          path="/health-worker/dashboard"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/patients"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerPatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/patients/new"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerNewPatientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/patients/:id"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerPatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/screenings"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerScreeningsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/screenings/new"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerNewScreeningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/referrals"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerReferralsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;