import { getAccessToken } from "./auth";
import type { AnalyzeScreeningResponse } from "./reports";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface Screening {
  id: number;
  patient: number;
  patient_name?: string;
  fundus_image?: string | null;
  status: "CREATED" | "IMAGE_UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScreeningPayload {
  patient: number;
}

export async function fetchScreenings(params?: {
  patient_id?: string | number;
  created_by?: string | number;
  date?: string;
}): Promise<Screening[]> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  const url = new URL(`${API_BASE_URL}/api/screenings/`);
  if (params?.patient_id) {
    url.searchParams.set("patient_id", String(params.patient_id));
  }
  if (params?.created_by) {
    url.searchParams.set("created_by", String(params.created_by));
  }
  if (params?.date) {
    url.searchParams.set("date", params.date);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
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
        ? "Access forbidden. Required role permission missing."
        : "Failed to fetch screenings list.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function createScreening(
  payload: CreateScreeningPayload
): Promise<Screening> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/screenings/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patient: payload.patient,
      }),
    });
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (errorData && typeof errorData === "object") {
      const messages = Object.entries(errorData)
        .map(
          ([field, err]) =>
            `${field}: ${Array.isArray(err) ? err.join(", ") : err}`
        )
        .join(" | ");
      throw new Error(messages || "Failed to create screening.");
    }
    throw new Error("Failed to create screening. Please try again.");
  }

  return response.json();
}

export async function uploadFundusImage(
  screeningId: number | string,
  imageFile: File
): Promise<Screening> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  const formData = new FormData();
  formData.append("fundus_image", imageFile);

  let response: Response;
  try {
    // IMPORTANT: Do NOT manually set Content-Type header so browser sets multipart boundary automatically
    response = await fetch(
      `${API_BASE_URL}/api/screenings/${screeningId}/upload/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 400
        ? "Invalid fundus image file. Please provide a valid JPG or PNG image."
        : response.status === 404
        ? "Screening record not found."
        : "Failed to upload fundus image.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function analyzeScreening(
  screeningId: number | string
): Promise<AnalyzeScreeningResponse> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/screenings/${screeningId}/analyze/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.error ||
      errorData?.message ||
      (response.status === 503
        ? "AI ML analysis service is currently unavailable. Please ensure ML service is active and try again."
        : "AI analysis could not be completed. Please try again later.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchScreeningById(
  id: string | number
): Promise<Screening> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/screenings/${id}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Screening not found.");
    }
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please log in again."
        : response.status === 403
        ? "Access forbidden. Health Worker role required."
        : "Failed to fetch screening details.");
    throw new Error(errorMessage);
  }

  return response.json();
}
