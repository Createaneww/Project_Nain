import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import {
  isAuthenticated,
  getStoredUser,
  getDashboardPathForRole,
  type UserRole,
} from "../services/auth";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  // 1. Check authentication status
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check role authorization
  const user = getStoredUser();
  if (allowedRoles && user && !allowedRoles.includes(user.role as UserRole)) {
    // Redirect to their own dashboard based on their role
    const userDashboard = getDashboardPathForRole(user.role);
    return <Navigate to={userDashboard} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
