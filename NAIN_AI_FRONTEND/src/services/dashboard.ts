import { getAccessToken } from "./auth";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface HealthWorkerDashboardData {
  health_worker: {
    id: number;
    username: string;
    full_name: string;
  };
  screenings: {
    total: number;
    today: number;
  };
  referrals_collected: {
    total: number;
  };
}

export interface DoctorDashboardData {
  doctor: {
    id: number;
    username: string;
    full_name: string;
  };
  referrals: {
    total_assigned: number;
    assigned: number;
    reviewed: number;
    collected: number;
  };
}

export interface AdminDashboardData {
  users: {
    total: number;
    admins: number;
    doctors: number;
    health_workers: number;
  };
  patients: {
    total: number;
  };
  screenings: {
    total: number;
  };
  reports: {
    total: number;
  };
  referrals: {
    total: number;
    pending: number;
    assigned: number;
    reviewed: number;
    collected: number;
  };
}

export async function fetchHealthWorkerDashboard(): Promise<HealthWorkerDashboardData> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please sign in again.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/dashboard/health-worker/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please ensure the Django backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please sign in again."
        : response.status === 403
        ? "Access forbidden. Health Worker privileges required."
        : "Failed to load dashboard data.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchDoctorDashboard(): Promise<DoctorDashboardData> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please sign in again.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/dashboard/doctor/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please ensure the Django backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please sign in again."
        : response.status === 403
        ? "Access forbidden. Doctor privileges required."
        : "Failed to load doctor dashboard data.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please sign in again.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/dashboard/admin/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please ensure the Django backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please sign in again."
        : response.status === 403
        ? "Access forbidden. Administrator privileges required."
        : "Failed to load admin dashboard data.");
    throw new Error(errorMessage);
  }

  return response.json();
}
