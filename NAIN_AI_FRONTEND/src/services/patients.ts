import { authenticatedFetch } from "./auth";

const API_BASE_URL = "http://127.0.0.1:8000";

export interface Patient {
  id: number;
  full_name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER" | string;
  phone_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientPayload {
  full_name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER" | string;
  phone_number?: string;
  email?: string;
  address?: string;
}

export interface ScreeningSummary {
  id: number;
  patient: number;
  patient_name: string;
  fundus_image: string | null;
  status: string;
  prediction?: string | null;
  confidence?: number | null;
  report_id?: number | null;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchPatients(search?: string): Promise<Patient[]> {
  const url = new URL(`${API_BASE_URL}/api/patients/`);
  if (search && search.trim()) {
    url.searchParams.set("search", search.trim());
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
      throw new Error("Access forbidden. Health Worker role required.");
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to fetch patients list.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchPatientById(id: string | number): Promise<Patient> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/patients/${id}/`, {
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
      throw new Error("Patient not found.");
    }
    const errorData = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    if (response.status === 403) {
      throw new Error("Access forbidden. Health Worker role required.");
    }
    const errorMessage =
      errorData?.detail ||
      errorData?.message ||
      "Failed to fetch patient details.";
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function fetchPatientScreenings(
  patientId: string | number
): Promise<ScreeningSummary[]> {
  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/screenings/?patient_id=${patientId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function createPatient(
  payload: CreatePatientPayload
): Promise<Patient> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}/api/patients/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(
      "Network error: Unable to connect to backend server. Please verify backend is running."
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (errorData && typeof errorData === "object") {
      const messages = Object.entries(errorData)
        .map(([field, err]) => `${field}: ${Array.isArray(err) ? err.join(", ") : err}`)
        .join(" | ");
      throw new Error(messages || "Failed to create patient.");
    }
    throw new Error("Failed to create patient. Please try again.");
  }

  return response.json();
}
