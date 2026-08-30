import { getAccessToken } from "./auth";

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

export async function fetchPatients(search?: string): Promise<Patient[]> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  const url = new URL(`${API_BASE_URL}/api/patients/`);
  if (search && search.trim()) {
    url.searchParams.set("search", search.trim());
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
        ? "Access forbidden. Health Worker role required."
        : "Failed to fetch patients list.");
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function createPatient(
  payload: CreatePatientPayload
): Promise<Patient> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/patients/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
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
        .map(([field, err]) => `${field}: ${Array.isArray(err) ? err.join(", ") : err}`)
        .join(" | ");
      throw new Error(messages || "Failed to create patient.");
    }
    throw new Error("Failed to create patient. Please try again.");
  }

  return response.json();
}
