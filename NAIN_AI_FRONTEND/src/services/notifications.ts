import { authenticatedFetch } from "./auth";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface AppNotification {
  id: number;
  type:
    | "REFERRAL_PENDING"
    | "CASE_ASSIGNED"
    | "CLINICAL_REVIEW_COMPLETED"
    | "REPORT_READY_FOR_COLLECTION"
    | "REPORT_COLLECTED"
    | "SYSTEM"
    | string;
  title: string;
  message: string;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  created_at: string;
  read_at?: string | null;
}

export async function fetchNotifications(params?: {
  is_read?: boolean;
}): Promise<AppNotification[]> {
  const url = new URL(`${API_BASE_URL}/api/notifications/`);
  if (params?.is_read !== undefined) {
    url.searchParams.set("is_read", String(params.is_read));
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
        : "Failed to fetch notifications.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/notifications/unread-count/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) return 0;
    const data = await response.json();
    return typeof data.unread_count === "number" ? data.unread_count : 0;
  } catch {
    return 0;
  }
}

export async function markNotificationAsRead(
  id: number | string
): Promise<AppNotification> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/${id}/read/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Network error: Unable to update notification.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to mark notification as read.");
  }

  return response.json();
}

export async function markAllNotificationsAsRead(): Promise<number> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/read-all/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Network error: Unable to update notifications.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || "Failed to mark all notifications as read."
    );
  }

  const data = await response.json();
  return typeof data.updated_count === "number" ? data.updated_count : 0;
}
