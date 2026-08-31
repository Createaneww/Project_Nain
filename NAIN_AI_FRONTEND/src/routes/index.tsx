import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../app/login/page";
import AdminDashboardPage from "../app/admin/dashboard/page";
import AdminUsersPage from "../app/admin/users/page";
import AdminUserDetailPage from "../app/admin/users/[id]/page";
import AdminDoctorsPage from "../app/admin/doctors/page";
import AdminDoctorDetailPage from "../app/admin/doctors/[id]/page";
import AdminPatientsPage from "../app/admin/patients/page";
import AdminPatientDetailPage from "../app/admin/patients/[id]/page";
import AdminScreeningsPage from "../app/admin/screenings/page";
import AdminScreeningDetailPage from "../app/admin/screenings/[id]/page";
import AdminReportsPage from "../app/admin/reports/page";
import AdminReportDetailPage from "../app/admin/reports/[id]/page";
import AdminReferralsPage from "../app/admin/referrals/page";
import AdminReferralsAssignPage from "../app/admin/referrals/assign/page";
import AdminReferralDetailPage from "../app/admin/referrals/[id]/page";
import AdminCollectionsPage from "../app/admin/collections/page";
import AdminActivityPage from "../app/admin/activity/page";
import AdminActivityDetailPage from "../app/admin/activity/[id]/page";
import AdminNotificationsPage from "../app/admin/notifications/page";
import DoctorDashboardPage from "../app/doctor/dashboard/page";
import DoctorReferralReviewPage from "../app/doctor/referrals/[id]/page";
import DoctorNotificationsPage from "../app/doctor/notifications/page";
import HealthWorkerDashboardPage from "../app/health-worker/dashboard/page";
import HealthWorkerNotificationsPage from "../app/health-worker/notifications/page";
import HealthWorkerPatientsPage from "../app/health-worker/patients/page";
import HealthWorkerNewPatientPage from "../app/health-worker/patients/new/page";
import HealthWorkerPatientDetailPage from "../app/health-worker/patients/[id]/page";
import HealthWorkerScreeningsPage from "../app/health-worker/screenings/page";
import HealthWorkerNewScreeningPage from "../app/health-worker/screenings/new/page";
import HealthWorkerScreeningDetailPage from "../app/health-worker/screenings/[id]/page";
import HealthWorkerUploadImagePage from "../app/health-worker/screenings/[id]/upload/page";
import HealthWorkerReportPage from "../app/health-worker/reports/[id]/page";
import HealthWorkerReferralsPage from "../app/health-worker/referrals/page";
import HealthWorkerReferralDetailPage from "../app/health-worker/referrals/[id]/page";
import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Dashboard & Management Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminUserDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/doctors"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDoctorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/doctors/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDoctorDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/patients"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminPatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/patients/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminPatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/screenings"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminScreeningsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/screenings/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminScreeningDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminReportDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/referrals"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminReferralsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/referrals/assign"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminReferralsAssignPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/referrals/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminReferralDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/collections"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminCollectionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activity"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activity/:id"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminActivityDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminNotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Doctor Dashboard & Referral Routes */}
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR"]}>
              <DoctorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/referrals/:id"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR"]}>
              <DoctorReferralReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/notifications"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR"]}>
              <DoctorNotificationsPage />
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
          path="/health-worker/notifications"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerNotificationsPage />
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
          path="/health-worker/patients/:id/screening"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerNewScreeningPage />
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
          path="/health-worker/screenings/:id"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerScreeningDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/screenings/:id/upload"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerUploadImagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health-worker/reports/:id"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerReportPage />
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
        <Route
          path="/health-worker/referrals/:id"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerReferralDetailPage />
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