import { authenticatedFetch } from "./auth";

const API_BASE_URL = "http://127.0.0.1:8000";
const ML_BASE_URL = "http://127.0.0.1:8001";

export interface QualityData {
  overall?: string;
  passed_checks?: number;
  resolution_pass?: boolean;
  brightness_pass?: boolean;
  contrast_pass?: boolean;
  sharpness_pass?: boolean;
  coverage_pass?: boolean;
  fundus_pass?: boolean;
  cropping_pass?: boolean;
  brightness?: number;
  contrast?: number;
  sharpness?: number;
  retinal_ratio?: number;
  colorful_ratio?: number;
  border_touch_ratio?: number;
  [key: string]: unknown;
}

export interface RetinalAnalysis {
  stage?: string;
  features?: string[];
  [key: string]: unknown;
}

export interface Report {
  id: number;
  screening_id: number;
  patient_name?: string;
  prediction: string;
  confidence: number;
  quality_data?: QualityData;
  probabilities?: Record<string, number>;
  retinal_analysis?: RetinalAnalysis | string[];
  original_image_url?: string;
  gradcam_url?: string;
  generated_at?: string;
}

export interface AnalyzeScreeningResponse {
  detail: string;
  screening_id: number;
  report_id: number;
  status: string;
  ml_result?: unknown;
}

export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/results/")) {
    return `${ML_BASE_URL}${url}`;
  }
  if (url.startsWith("/media/")) {
    return `${API_BASE_URL}${url}`;
  }
  return `${ML_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function fetchReports(): Promise<Report[]> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/reports/`, {
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
      "Failed to fetch reports list.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchReportById(id: string | number): Promise<Report> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/reports/${id}/`, {
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
      throw new Error("Report not found.");
    }
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      (response.status === 401
        ? "Session expired. Please log in again."
        : response.status === 403
        ? "Access forbidden. Required role permission missing."
        : "Failed to fetch report details.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchReportByScreeningId(
  screeningId: string | number
): Promise<Report> {
  let response: Response;
  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/api/screenings/${screeningId}/report/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Report not available for this screening yet.");
    }
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to fetch report for this screening.";
    throw new Error(errorMessage);
  }

  return response.json();
}
