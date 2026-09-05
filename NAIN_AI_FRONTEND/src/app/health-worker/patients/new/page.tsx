import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPatient } from "../../../../services/patients";

interface FormErrors {
  full_name?: string;
  age?: string;
  gender?: string;
  email?: string;
}

function HealthWorkerNewPatientPage() {
  const navigate = useNavigate();

  // Form input state
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // UI state
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full Name validation
    if (!fullName.trim()) {
      newErrors.full_name = "Full name is required.";
    }

    // Age validation
    const parsedAge = parseInt(age, 10);
    if (!age.trim()) {
      newErrors.age = "Age is required.";
    } else if (isNaN(parsedAge) || parsedAge <= 0) {
      newErrors.age = "Age must be a valid positive number.";
    } else if (parsedAge > 125) {
      newErrors.age = "Please enter a realistic age.";
    }

    // Gender validation
    if (!gender || !["MALE", "FEMALE", "OTHER"].includes(gender)) {
      newErrors.gender = "Please select a gender.";
    }

    // Email validation (optional field, but if provided must match format)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = "Please enter a valid email address.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await createPatient({
        full_name: fullName.trim(),
        age: parseInt(age.trim(), 10),
        gender: gender as "MALE" | "FEMALE" | "OTHER",
        phone_number: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });

      setSuccessMessage("Patient created successfully! Redirecting to patients list...");

      // Redirect to patients list
      setTimeout(() => {
        navigate("/health-worker/patients");
      }, 600);
    } catch (err) {
      if (err instanceof Error) {
        setApiError(err.message);
      } else {
        setApiError("An unexpected error occurred while creating patient.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#3F54DA] tracking-wider uppercase">
              Registration Intake
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">
              New Medical Record
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F1F5C] tracking-tight mt-1">
            Add New Patient
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Register a new patient into the clinical directory for diabetic retinopathy screening.
          </p>
        </div>

        <Link
          to="/health-worker/patients"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Patients</span>
        </Link>
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
          <span className="font-semibold text-emerald-900">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {apiError && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 shadow-sm flex items-start gap-3"
          role="alert"
        >
          <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-bold text-rose-900">
              Failed to create patient record
            </p>
            <p className="mt-0.5 text-xs text-rose-700">{apiError}</p>
          </div>
        </div>
      )}

      {/* Patient Form Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h3 className="text-base font-bold text-[#0F1F5C]">
            Patient Identification & Demographics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Fields marked with <span className="text-rose-500 font-semibold">*</span> are required for clinical identification.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.full_name) {
                  setErrors((prev) => ({ ...prev, full_name: undefined }));
                }
              }}
              placeholder="e.g. Ramesh Kumar"
              disabled={submitting}
              className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed ${
                errors.full_name
                  ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                  : "border-slate-200 bg-slate-50 focus:bg-white focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10"
              }`}
            />
            {errors.full_name && (
              <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Age & Gender Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Age */}
            <div>
              <label
                htmlFor="age"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Age (Years) <span className="text-rose-500">*</span>
              </label>
              <input
                id="age"
                type="number"
                min="1"
                max="125"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  if (errors.age) {
                    setErrors((prev) => ({ ...prev, age: undefined }));
                  }
                }}
                placeholder="e.g. 52"
                disabled={submitting}
                className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed ${
                  errors.age
                    ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                    : "border-slate-200 bg-slate-50 focus:bg-white focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10"
                }`}
              />
              {errors.age && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                  {errors.age}
                </p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label
                htmlFor="gender"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  if (errors.gender) {
                    setErrors((prev) => ({ ...prev, gender: undefined }));
                  }
                }}
                disabled={submitting}
                className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm outline-none transition bg-slate-50 focus:bg-white disabled:bg-slate-50 disabled:cursor-not-allowed ${
                  errors.gender
                    ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                    : "border-slate-200 focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10"
                }`}
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              {errors.gender && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                  {errors.gender}
                </p>
              )}
            </div>
          </div>

          {/* Phone & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Phone Number <span className="text-xs text-slate-400 font-normal lowercase">(Optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 py-2.5 text-xs sm:text-sm outline-none transition focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:cursor-not-allowed font-mono"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-xs text-slate-400 font-normal lowercase">(Optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                placeholder="e.g. patient@example.com"
                disabled={submitting}
                className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed ${
                  errors.email
                    ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                    : "border-slate-200 bg-slate-50 focus:bg-white focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10"
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-600 font-semibold">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="address"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Residential Address <span className="text-xs text-slate-400 font-normal lowercase">(Optional)</span>
            </label>
            <textarea
              id="address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter patient residential or village address..."
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-4 py-2.5 text-xs sm:text-sm outline-none transition focus:border-[#3F54DA] focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              to="/health-worker/patients"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#3F54DA] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#3F54DA]/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-[#3F54DA]/30 transition duration-150 active:scale-[0.98] disabled:bg-blue-400 disabled:cursor-not-allowed"
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
                  <span>Creating Patient...</span>
                </>
              ) : (
                <span>Register Patient</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HealthWorkerNewPatientPage;
