import { authenticatedFetch } from "./auth";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface ActivityLogItem {
  id: number;
  event_type: string;
  category:
    | "PATIENT"
    | "SCREENING"
    | "AI_ANALYSIS"
    | "REFERRAL"
    | "CLINICAL_EVALUATION"
    | "COLLECTION"
    | "USER_MANAGEMENT"
    | "AUTH"
    | string;
  actor_name: string;
  actor_role: string;
  entity_type?: string;
  entity_id?: string;
  patient_id?: number | null;
  patient_name?: string;
  details: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export async function fetchActivityLogs(params?: {
  category?: string;
  role?: string;
  date_range?: string;
  search?: string;
}): Promise<ActivityLogItem[]> {
  const url = new URL(`${API_BASE_URL}/api/admin/activity/`);
  if (params?.category && params.category !== "ALL") {
    url.searchParams.set("category", params.category);
  }
  if (params?.role && params.role !== "ALL") {
    url.searchParams.set("role", params.role);
  }
  if (params?.date_range && params.date_range !== "ALL") {
    url.searchParams.set("date_range", params.date_range);
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
        : "Failed to fetch activity logs.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchActivityLogById(
  id: string | number
): Promise<ActivityLogItem> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/admin/activity/${id}/`, {
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
      throw new Error("Activity log not found.");
    }
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please log in again."
        : response.status === 403
        ? "Access forbidden. Administrator privileges required."
        : "Failed to fetch activity log details.");
    throw new Error(errorMessage);
  }

  return response.json();
}
