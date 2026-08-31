import { useEffect, useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import { fetchPatientById, type Patient } from "../../../../services/patients";
import {
  createScreening,
  uploadFundusImage,
  type Screening,
} from "../../../../services/screenings";

function HealthWorkerNewScreeningPage() {
  const navigate = useNavigate();
  const { id: routePatientId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get("patient_id");
  const patientId = routePatientId || queryPatientId;

  const storedUser = getStoredUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient loading state
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loadingPatient, setLoadingPatient] = useState<boolean>(true);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [isPatientNotFound, setIsPatientNotFound] = useState<boolean>(false);

  // Screening state (cached if already created)
  const [createdScreening, setCreatedScreening] = useState<Screening | null>(null);

  // Image selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Action / Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionStepText, setActionStepText] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Patient data
  const loadPatient = useCallback(async () => {
    if (!patientId || !patientId.trim()) {
      setLoadingPatient(false);
      setPatient(null);
      return;
    }

    setLoadingPatient(true);
    setPatientError(null);
    setIsPatientNotFound(false);

    try {
      const patientData = await fetchPatientById(patientId.trim());
      setPatient(patientData);
    } catch (err) {
      if (err instanceof Error) {
        if (
          err.message.toLowerCase().includes("not found") ||
          err.message.includes("404")
        ) {
          setIsPatientNotFound(true);
        }
        setPatientError(err.message);
      } else {
        setPatientError("Failed to load patient information. Please try again.");
      }
      setPatient(null);
    } finally {
      setLoadingPatient(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  // Clean up object URL preview on unmount or file change
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const formatGender = (gender?: string): string => {
    if (!gender) return "—";
    const g = gender.toUpperCase();
    if (g === "MALE") return "Male";
    if (g === "FEMALE") return "Female";
    if (g === "OTHER") return "Other";
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  // Validate and assign chosen file
  const handleFileSelection = (file: File | null) => {
    setFileError(null);
    setApiError(null);

    if (!file) {
      return;
    }

    // Supported MIME types and extensions: JPG, JPEG, PNG
    const validMimeTypes = ["image/jpeg", "image/jpg", "image/png"];
    const validExtensions = [".jpg", ".jpeg", ".png"];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!validMimeTypes.includes(file.type) && !hasValidExtension) {
      setFileError(
        "Unsupported file format. Please upload a valid JPG, JPEG, or PNG retinal fundus image."
      );
      return;
    }

    // Clean previous preview
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedFile(file);
    const newPreviewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(newPreviewUrl);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!submitting) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (submitting) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Handle Complete Screening Creation & Upload flow
  const handleUploadAndContinue = async () => {
    if (!patient) {
      setApiError("Valid patient record required.");
      return;
    }

    if (!selectedFile) {
      setFileError("Please select a retinal fundus image before submitting.");
      return;
    }

    setSubmitting(true);
    setApiError(null);
    setFileError(null);
    setSuccessMessage(null);

    try {
      let screeningRecord = createdScreening;

      // Step 1: Create screening record if one does not already exist
      if (!screeningRecord) {
        setActionStepText("Creating screening record...");
        screeningRecord = await createScreening({
          patient: patient.id,
        });
        setCreatedScreening(screeningRecord);
      }

      // Step 2: Upload selected fundus image
      setActionStepText("Uploading fundus image...");
      const updatedScreening = await uploadFundusImage(
        screeningRecord.id,
        selectedFile
      );

      setSuccessMessage("Fundus image uploaded successfully.");
      setActionStepText("Redirecting to screening details...");

      // Step 3: Navigate to screening details page
      setTimeout(() => {
        navigate(`/health-worker/screenings/${updatedScreening.id}`);
      }, 600);
    } catch (err) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("An unexpected error occurred during image upload.");
      }
      setActionStepText(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/health-worker/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 transition"
              title="Return to Dashboard"
            >
              👁️
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">NAIN AI</span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                  Health Worker
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Diabetic Retinopathy Screening System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={
                patient
                  ? `/health-worker/patients/${patient.id}`
                  : "/health-worker/patients"
              }
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              {patient ? "← Back to Patient" : "← Back to Patients"}
            </Link>
            {storedUser && (
              <span className="hidden md:inline-block text-xs font-medium text-slate-500 border-l border-slate-200 pl-3">
                {storedUser.first_name || storedUser.username}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* 1. PAGE HEADER & BREADCRUMB */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            to="/health-worker/dashboard"
            className="hover:text-blue-600 transition"
          >
            Dashboard
          </Link>
          <span>/</span>
          <Link
            to="/health-worker/patients"
            className="hover:text-blue-600 transition"
          >
            Patients
          </Link>
          <span>/</span>
          {patient ? (
            <Link
              to={`/health-worker/patients/${patient.id}`}
              className="hover:text-blue-600 transition"
            >
              Patient Details
            </Link>
          ) : (
            <span>Patient Details</span>
          )}
          <span>/</span>
          <span className="text-slate-800 font-medium">New Screening</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              New Screening
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload a fundus image to begin AI-assisted diabetic retinopathy screening.
            </p>
          </div>
          {patient && (
            <Link
              to={`/health-worker/patients/${patient.id}`}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              ← Back to Patient
            </Link>
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center gap-3"
            role="status"
          >
            <span className="text-xl">✅</span>
            <div>
              <p className="font-semibold text-emerald-900">{successMessage}</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {actionStepText || "Proceeding to screening details..."}
              </p>
            </div>
          </div>
        )}

        {/* API Error Alert */}
        {apiError && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-start gap-3"
            role="alert"
          >
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-red-900">
                Action could not be completed
              </p>
              <p className="mt-0.5 text-xs text-red-700">{apiError}</p>
            </div>
            <button
              type="button"
              onClick={handleUploadAndContinue}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Patient State */}
        {loadingPatient && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="h-16 w-16 rounded-2xl bg-slate-200"></div>
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-slate-200 rounded"></div>
                  <div className="h-4 w-32 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-12 bg-slate-100 rounded-xl"></div>
                <div className="h-12 bg-slate-100 rounded-xl"></div>
                <div className="h-12 bg-slate-100 rounded-xl"></div>
              </div>
            </div>
            <div className="flex items-center justify-center py-4 text-slate-500 text-sm gap-2">
              <svg
                className="h-4 w-4 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              <span>Loading patient information...</span>
            </div>
          </div>
        )}

        {/* Missing Patient ID State */}
        {!loadingPatient && (!patientId || !patientId.trim()) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600 border border-amber-100">
              ⚠️
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              No patient selected.
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
              Please select a patient before initiating a new retinal screening.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/health-worker/patients"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                ← Back to Patients
              </Link>
            </div>
          </div>
        )}

        {/* Patient Not Found State */}
        {!loadingPatient &&
          patientId &&
          patientId.trim() &&
          (isPatientNotFound || (patientError && !patient)) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600 border border-red-100">
                👤
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Patient not found.
              </h2>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                No patient record exists with ID #{patientId}.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  to="/health-worker/patients"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  ← Back to Patients
                </Link>
                <button
                  type="button"
                  onClick={loadPatient}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

        {/* 2. PATIENT SUMMARY CARD & 4. FUNDUS IMAGE UPLOAD CARD */}
        {!loadingPatient && patient && (
          <div className="space-y-6">
            {/* 2. PATIENT SUMMARY CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Selected Patient
                </h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100">
                  Active Profile
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-md shadow-blue-500/20">
                    {patient.full_name
                      ? patient.full_name.charAt(0).toUpperCase()
                      : "P"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-xl font-bold text-slate-900">
                        {patient.full_name || "Unnamed Patient"}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 font-mono">
                        Patient #{patient.id}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <span>{patient.age} years</span>
                      <span>•</span>
                      <span>{formatGender(patient.gender)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:text-right text-xs text-slate-500">
                  {patient.phone_number || patient.phone ? (
                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                      <span className="block text-slate-400">Phone</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {patient.phone_number || patient.phone}
                      </span>
                    </div>
                  ) : null}
                  {patient.email ? (
                    <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                      <span className="block text-slate-400">Email</span>
                      <span className="font-semibold text-slate-800 truncate block max-w-[140px]">
                        {patient.email}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 4. FUNDUS IMAGE UPLOAD CARD */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Upload Fundus Image
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Upload a clear retinal fundus image for AI analysis.
                </p>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                onChange={handleInputChange}
                disabled={submitting}
              />

              {/* Drag and Drop / Upload Dropzone */}
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                      : "border-slate-300 hover:border-blue-400 hover:bg-slate-50/70 bg-slate-50/30"
                  }`}
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-3xl shadow-sm mb-4">
                    📷
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Drag and drop your fundus image here, or browse
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Supports high-resolution JPG, JPEG, or PNG retinal scans (Max 15MB)
                  </p>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 border border-blue-200 shadow-sm hover:bg-blue-50 transition"
                    >
                      <span>Choose Image</span>
                      <span>📁</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected File Preview Container */
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold text-sm">
                        ✓
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || "image"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={submitting}
                        className="rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Visual Preview Box */}
                  {imagePreviewUrl && (
                    <div className="flex justify-center bg-slate-900 rounded-xl overflow-hidden max-h-80 p-2">
                      <img
                        src={imagePreviewUrl}
                        alt="Selected Fundus Retinal Preview"
                        className="max-h-72 object-contain rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Validation File Error Message */}
              {fileError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{fileError}</span>
                </div>
              )}

              {/* 5. UPLOAD ACTION BUTTONS */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <Link
                  to={`/health-worker/patients/${patient.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
                >
                  Cancel
                </Link>

                <button
                  type="button"
                  onClick={handleUploadAndContinue}
                  disabled={submitting || !selectedFile}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                      <span>{actionStepText || "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <span>Upload & Continue</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default HealthWorkerNewScreeningPage;
