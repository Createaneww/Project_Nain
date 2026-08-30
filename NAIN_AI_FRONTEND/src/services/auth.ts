const API_BASE_URL = "http://127.0.0.1:8000";

export type UserRole = "ADMIN" | "DOCTOR" | "HEALTH_WORKER";

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole | string;
}

export async function loginUser(credentials: {
  username: string;
  password: string;
}): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new Error(
      "Network error: Unable to connect to server. Please ensure the backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Invalid username or password."
        : "Failed to login. Please try again.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getUserProfile(accessToken: string): Promise<UserProfile> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new Error(
      "Network error: Unable to fetch user profile from server."
    );
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user profile.");
  }

  return response.json();
}

// Session & Storage Management
export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function getStoredUser(): UserProfile | null {
  const userJson = localStorage.getItem("user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson) as UserProfile;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken() && !!getStoredUser();
}

export function logout(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export function getDashboardPathForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "DOCTOR":
      return "/doctor/dashboard";
    case "HEALTH_WORKER":
      return "/health-worker/dashboard";
    default:
      return "/login";
  }
}
