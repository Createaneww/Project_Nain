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

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
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

// Token Refresh Mechanism with mutex/singleton promise to prevent concurrent refresh race conditions
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        logout();
        return null;
      }

      const data = await response.json();
      if (data && data.access) {
        localStorage.setItem("access_token", data.access);
        if (data.refresh) {
          localStorage.setItem("refresh_token", data.refresh);
        }
        return data.access as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Authenticated fetch helper that injects Bearer token and automatically handles
 * 401 token expiration by refreshing the access token and retrying the request once.
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    token = await refreshAccessToken();
  }

  const buildHeaders = (authToken: string | null): Headers => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    return headers;
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: buildHeaders(token),
    });
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  // Handle 401 Unauthorized (expired or invalid access token)
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      try {
        response = await fetch(url, {
          ...options,
          headers: buildHeaders(newToken),
        });
      } catch {
        throw new Error(
          "Network error: Unable to connect to backend server. Please verify backend is running."
        );
      }
    } else {
      logout();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please sign in again.");
    }
  }

  return response;
}

// Password Reset Services
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/password-reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new Error("Network error: Unable to connect to server. Please check your connection.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || errorData?.message || "Failed to request password reset.");
  }

  return response.json();
}

export async function verifyPasswordResetToken(
  uid: string,
  token: string
): Promise<{ valid: boolean; username?: string; detail?: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/password-reset/verify/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, token }),
    });
  } catch {
    throw new Error("Network error: Unable to verify reset token.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    return { valid: false, detail: errorData?.detail || "Invalid or expired reset token." };
  }

  return response.json();
}

export async function confirmPasswordReset(credentials: {
  uid: string;
  token: string;
  new_password: string;
  confirm_password: string;
}): Promise<{ message: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new Error("Network error: Unable to connect to server. Please try again.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail ||
      errorData?.message ||
      "Failed to reset password. Please ensure passwords match and meet security criteria."
    );
  }

  return response.json();
}
