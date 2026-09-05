import { authenticatedFetch } from "./auth";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface AdminUser {
  id: number;
  username: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role: "ADMIN" | "DOCTOR" | "HEALTH_WORKER" | string;
  specialization?: string;
  is_active: boolean;
  date_joined: string;
}

export async function fetchAdminUsers(params?: {
  role?: string;
  search?: string;
}): Promise<AdminUser[]> {
  const url = new URL(`${API_BASE_URL}/api/admin/users/`);
  if (params?.role && params.role !== "ALL") {
    url.searchParams.set("role", params.role);
  }
  if (params?.search && params.search.trim()) {
    url.searchParams.set("search", params.search.trim());
  }

  let response: Response;
  try {
    response = await authenticatedFetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please log in again."
        : response.status === 403
        ? "Access forbidden. Administrator privileges required."
        : "Failed to fetch users list.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchAdminUserById(
  id: string | number
): Promise<AdminUser> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${id}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("User not found.");
    }
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please log in again."
        : response.status === 403
        ? "Access forbidden. Administrator privileges required."
        : "Failed to fetch user details.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function createAdminUser(data: {
  username: string;
  email?: string;
  password: string;
  role: string;
  full_name?: string;
  is_active?: boolean;
}): Promise<AdminUser> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    let errorMessage = "Failed to create new user.";
    if (errorData) {
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (typeof errorData.message === "string") {
        errorMessage = errorData.message;
      } else {
        const fieldErrors = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join(" | ");
        if (fieldErrors) errorMessage = fieldErrors;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function updateAdminUser(
  id: string | number,
  data: {
    username?: string;
    email?: string;
    full_name?: string;
    role?: string;
    is_active?: boolean;
    password?: string;
  }
): Promise<AdminUser> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    let errorMessage = "Failed to update user.";
    if (errorData) {
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (typeof errorData.message === "string") {
        errorMessage = errorData.message;
      } else {
        const fieldErrors = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join(" | ");
        if (fieldErrors) errorMessage = fieldErrors;
      }
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function resetAdminUserPassword(
  id: string | number,
  newPassword: string
): Promise<AdminUser> {
  return updateAdminUser(id, { password: newPassword });
}

export async function toggleAdminUserActive(
  id: string | number,
  isActive: boolean
): Promise<AdminUser> {
  return updateAdminUser(id, { is_active: isActive });
}
