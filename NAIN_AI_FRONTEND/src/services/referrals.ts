import { authenticatedFetch } from "./auth";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface ReferralPatient {
  id: number;
  full_name: string;
  age?: number;
  gender?: string;
  phone_number?: string;
  email?: string;
  address?: string;
}

export interface ReferralScreening {
  id: number;
  status: string;
  fundus_image?: string | null;
  created_at?: string;
}

export interface ReferralAIReport {
  id: number;
  prediction: string;
  confidence: number;
  probabilities?: Record<string, number>;
  quality_data?: Record<string, unknown>;
  retinal_analysis?: {
    stage?: string;
    features?: string[];
    [key: string]: unknown;
  } | string[];
  original_image_url?: string;
  gradcam_url?: string;
  fundus_image?: string | null;
  gradcam_image?: string | null;
  detected_stage?: string;
  retinal_findings?: string[];
  key_features?: string[];
  observations?: string[];
  generated_at?: string;
}

export interface Referral {
  id: number;
  report_id: number;
  screening_id: number;
  patient_id: number;
  patient_name: string;
  prediction: string;
  confidence?: number;
  priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE" | string;
  assigned_doctor: number | null;
  assigned_doctor_name: string | null;
  status: "PENDING" | "ASSIGNED" | "REVIEWED" | "COLLECTED" | string;
  available_for_claim?: boolean;
  doctor_notes: string;
  reviewed_at: string | null;
  collected_at: string | null;
  collected_by: number | null;
  collected_by_name: string | null;
  collected_by_role?: string | null;
  retinal_analysis?: {
    stage?: string;
    features?: string[];
    [key: string]: unknown;
  } | string[];
  ai_report?: ReferralAIReport;
  patient?: ReferralPatient;
  screening?: ReferralScreening;
  referral?: Partial<Referral>;
  created_at: string;
  updated_at: string;
}

export interface DoctorUser {
  id: number;
  username: string;
  full_name: string;
  email?: string;
}

export async function fetchDoctors(): Promise<DoctorUser[]> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/auth/doctors/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export async function fetchReferrals(params?: {
  status?: string;
  patient_id?: string | number;
  doctor_id?: string | number;
}): Promise<Referral[]> {
  const url = new URL(`${API_BASE_URL}/api/referrals/`);
  if (params?.status && params.status !== "ALL") {
    url.searchParams.set("status", params.status);
  }
  if (params?.patient_id) {
    url.searchParams.set("patient_id", String(params.patient_id));
  }
  if (params?.doctor_id) {
    url.searchParams.set("doctor_id", String(params.doctor_id));
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
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    if (response.status === 403) {
      throw new Error("Access forbidden. Required role permission missing.");
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to fetch referrals list.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchReferralById(
  id: string | number
): Promise<Referral> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/referrals/${id}/`, {
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
      throw new Error("Referral not found.");
    }
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    if (response.status === 403) {
      throw new Error("Access forbidden. Required role permission missing.");
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to fetch referral details.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function assignDoctorToReferral(
  referralId: string | number,
  doctorId: number
): Promise<Referral> {
  let response: Response;
  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/api/referrals/${referralId}/assign-doctor/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctor_id: doctorId,
        }),
      }
    );
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
      "Failed to assign doctor to referral.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function claimReferral(
  referralId: string | number
): Promise<Referral> {
  let response: Response;
  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/api/referrals/${referralId}/claim/`,
      {
        method: "POST",
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
    const errorData = await response.json().catch(() => null);
    if (response.status === 409) {
      throw new Error(
        errorData?.detail ||
          "This referral has already been claimed by another specialist."
      );
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to claim this referral.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function reviewReferral(
  id: string | number,
  doctorNotes: string
): Promise<Referral> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/referrals/${id}/review/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        doctor_notes: doctorNotes,
      }),
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
      "Failed to submit doctor review.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function collectReferral(
  id: string | number
): Promise<Referral> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/referrals/${id}/collect/`, {
      method: "PATCH",
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
      "Failed to collect finalized referral report.";
    throw new Error(errorMessage);
  }

  return response.json();
}
