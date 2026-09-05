import { authenticatedFetch } from "./auth";

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
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/dashboard/health-worker/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please ensure the Django backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    if (response.status === 403) {
      throw new Error("Access forbidden. Health Worker privileges required.");
    }
    if (response.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to load dashboard data.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchDoctorDashboard(): Promise<DoctorDashboardData> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/dashboard/doctor/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please ensure the Django backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    if (response.status === 403) {
      throw new Error("Access forbidden. Doctor privileges required.");
    }
    if (response.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to load doctor dashboard data.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/dashboard/admin/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please ensure the Django backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    if (response.status === 403) {
      throw new Error("Access forbidden. Administrator privileges required.");
    }
    if (response.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to load admin dashboard data.";
    throw new Error(errorMessage);
  }

  return response.json();
}
