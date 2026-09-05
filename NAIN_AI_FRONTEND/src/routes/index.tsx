import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../app/login/page";
import ForgotPasswordPage from "../app/forgot-password/page";
import ResetPasswordPage from "../app/reset-password/page";
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
import AdminLayout from "../components/AdminLayout";
import DoctorLayout from "../components/DoctorLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import HealthWorkerLayout from "../components/HealthWorkerLayout";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin Dashboard & Management Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="doctors" element={<AdminDoctorsPage />} />
          <Route path="doctors/:id" element={<AdminDoctorDetailPage />} />
          <Route path="patients" element={<AdminPatientsPage />} />
          <Route path="patients/:id" element={<AdminPatientDetailPage />} />
          <Route path="screenings" element={<AdminScreeningsPage />} />
          <Route path="screenings/:id" element={<AdminScreeningDetailPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="reports/:id" element={<AdminReportDetailPage />} />
          <Route path="referrals" element={<AdminReferralsPage />} />
          <Route path="referrals/assign" element={<AdminReferralsAssignPage />} />
          <Route path="referrals/:id" element={<AdminReferralDetailPage />} />
          <Route path="collections" element={<AdminCollectionsPage />} />
          <Route path="activity" element={<AdminActivityPage />} />
          <Route path="activity/:id" element={<AdminActivityDetailPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
        </Route>

        {/* Doctor Dashboard & Workflow Routes */}
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={["DOCTOR"]}>
              <DoctorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboardPage />} />
          <Route path="referrals/:id" element={<DoctorReferralReviewPage />} />
          <Route path="notifications" element={<DoctorNotificationsPage />} />
        </Route>

        {/* Health Worker Dashboard & Workflow Routes */}
        <Route
          path="/health-worker"
          element={
            <ProtectedRoute allowedRoles={["HEALTH_WORKER"]}>
              <HealthWorkerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HealthWorkerDashboardPage />} />
          <Route path="notifications" element={<HealthWorkerNotificationsPage />} />
          <Route path="patients" element={<HealthWorkerPatientsPage />} />
          <Route path="patients/new" element={<HealthWorkerNewPatientPage />} />
          <Route path="patients/:id" element={<HealthWorkerPatientDetailPage />} />
          <Route path="patients/:id/screening" element={<HealthWorkerNewScreeningPage />} />
          <Route path="screenings" element={<HealthWorkerScreeningsPage />} />
          <Route path="screenings/new" element={<HealthWorkerNewScreeningPage />} />
          <Route path="screenings/:id" element={<HealthWorkerScreeningDetailPage />} />
          <Route path="screenings/:id/upload" element={<HealthWorkerUploadImagePage />} />
          <Route path="reports/:id" element={<HealthWorkerReportPage />} />
          <Route path="referrals" element={<HealthWorkerReferralsPage />} />
          <Route path="referrals/:id" element={<HealthWorkerReferralDetailPage />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;