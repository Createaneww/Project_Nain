import { useEffect, useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3F54DA] tracking-wider uppercase">
              Clinical Intake
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              Image Acquisition
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            New Screening
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload patient retinal fundus photograph to begin automated AI-assisted diabetic retinopathy screening.
          </p>
        </div>

        {patient ? (
          <Link
            to={`/health-worker/patients/${patient.id}`}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Patient</span>
          </Link>
        ) : (
          <Link
            to="/health-worker/patients"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Select Patient</span>
          </Link>
        )}
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-800 shadow-sm flex items-center gap-3"
          role="status"
        >
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-bold text-emerald-900">{successMessage}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {actionStepText || "Proceeding to screening details..."}
            </p>
          </div>
        </div>
      )}

      {/* API Error Alert */}
      {apiError && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-sm flex items-start gap-3"
          role="alert"
        >
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="font-bold text-rose-900">
              Upload could not be completed
            </p>
            <p className="mt-0.5 text-xs text-rose-700">{apiError}</p>
          </div>
          <button
            type="button"
            onClick={handleUploadAndContinue}
            disabled={submitting}
            className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Patient State */}
      {loadingPatient && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm animate-pulse">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="h-16 w-16 rounded-2xl bg-slate-200" />
              <div className="space-y-2">
                <div className="h-6 w-48 bg-slate-200 rounded" />
                <div className="h-4 w-32 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-12 bg-slate-100 rounded-xl" />
              <div className="h-12 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {/* Missing Patient ID State */}
      {!loadingPatient && (!patientId || !patientId.trim()) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No patient selected
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Please select an existing patient or register a new profile before initiating a retinal screening.
          </p>
          <div className="mt-6">
            <Link
              to="/health-worker/patients"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <span>Select Patient from Directory</span>
            </Link>
          </div>
        </div>
      )}

      {/* Patient Not Found State */}
      {!loadingPatient &&
        patientId &&
        patientId.trim() &&
        (isPatientNotFound || (patientError && !patient)) && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Patient record not found
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              No patient record exists with ID #{patientId}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/health-worker/patients"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3F54DA] text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm"
              >
                <span>Back to Patients</span>
              </Link>
              <button
                type="button"
                onClick={loadPatient}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Retry
              </button>
            </div>
          </div>
        )}

      {/* PATIENT SUMMARY CARD & FUNDUS IMAGE UPLOAD CARD */}
      {!loadingPatient && patient && (
        <div className="space-y-6">
          {/* Patient Summary Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Selected Patient Profile
              </h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#3F54DA] border border-blue-100">
                Active Candidate
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1D4ED8] to-[#3F54DA] text-2xl font-bold text-white shadow-md shadow-blue-950/20">
                  {patient.full_name
                    ? patient.full_name.charAt(0).toUpperCase()
                    : "P"}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-xl font-bold text-[#0F1F5C] tracking-tight">
                      {patient.full_name || "Unnamed Patient"}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200 font-mono">
                      Patient #{patient.id}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                    <span>{patient.age} years</span>
                    <span>&bull;</span>
                    <span>{formatGender(patient.gender)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-xs text-slate-500">
                {patient.phone_number || patient.phone ? (
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                    <span className="block text-slate-400 text-[11px]">Phone</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {patient.phone_number || patient.phone}
                    </span>
                  </div>
                ) : null}
                {patient.email ? (
                  <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                    <span className="block text-slate-400 text-[11px]">Email</span>
                    <span className="font-bold text-slate-800 truncate block max-w-[140px]">
                      {patient.email}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* FUNDUS IMAGE UPLOAD CARD */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                Upload Retinal Fundus Photograph
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload a high-resolution retinal fundus photograph acquired from the examination device.
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
                    ? "border-[#3F54DA] bg-blue-50/60 scale-[0.99]"
                    : "border-slate-300 hover:border-[#3F54DA] hover:bg-slate-50/70 bg-slate-50/40"
                }`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#3F54DA] border border-blue-100 shadow-sm mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Drag and drop fundus scan here, or click to browse
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Supports high-resolution JPG, JPEG, or PNG retinal fundus scans (Max 15MB)
                </p>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-xs font-bold text-[#3F54DA] border border-blue-200 shadow-sm hover:bg-blue-50 transition"
                  >
                    <span>Browse File</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Selected File Preview Container */
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; {selectedFile.type || "image"}
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
                      className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
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
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{fileError}</span>
              </div>
            )}

            {/* Upload Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
              <Link
                to={`/health-worker/patients/${patient.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={handleUploadAndContinue}
                disabled={submitting || !selectedFile}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#3F54DA] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#3F54DA]/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-[#3F54DA]/30 transition duration-150 active:scale-[0.98] disabled:bg-blue-300 disabled:cursor-not-allowed"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>{actionStepText || "Processing..."}</span>
                  </>
                ) : (
                  <>
                    <span>Upload & Continue</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthWorkerNewScreeningPage;
