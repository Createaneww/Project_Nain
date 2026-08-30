import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../../services/auth";
import { createPatient } from "../../../../services/patients";

interface FormErrors {
  full_name?: string;
  age?: string;
  gender?: string;
  email?: string;
}

function HealthWorkerNewPatientPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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

      setSuccessMessage("Patient created successfully! Redirecting...");

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
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
              to="/health-worker/patients"
              className="hidden sm:inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition"
            >
              ← Back to Patients
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
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb & Header */}
        <div>
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
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
            <span className="text-slate-800 font-medium">Add New Patient</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Add New Patient
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Register a new patient for diabetic retinopathy screening.
              </p>
            </div>
            <Link
              to="/health-worker/patients"
              className="hidden sm:inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition"
            >
              ← Back to Patients
            </Link>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm flex items-center gap-3"
            role="status"
          >
            <span className="text-lg">✅</span>
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {apiError && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm flex items-start gap-3"
            role="alert"
          >
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-semibold text-red-900">
                Failed to create patient
              </p>
              <p className="mt-0.5 text-xs text-red-700">{apiError}</p>
            </div>
          </div>
        )}

        {/* Patient Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Patient Information
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Please enter the clinical identification details below. Fields marked with <span className="text-red-500 font-semibold">*</span> are required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Full Name <span className="text-red-500">*</span>
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
                placeholder="Enter patient's full name"
                disabled={submitting}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed ${
                  errors.full_name
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                }`}
              />
              {errors.full_name && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">
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
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Age (Years) <span className="text-red-500">*</span>
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
                  placeholder="Enter age"
                  disabled={submitting}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed ${
                    errors.age
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                {errors.age && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">
                    {errors.age}
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label
                  htmlFor="gender"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Gender <span className="text-red-500">*</span>
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
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition bg-white disabled:bg-slate-50 disabled:cursor-not-allowed ${
                    errors.gender
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                {errors.gender && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">
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
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Phone Number <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Email Address <span className="text-xs text-slate-400 font-normal">(Optional)</span>
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
                  placeholder="Enter email address"
                  disabled={submitting}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed ${
                    errors.email
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Address <span className="text-xs text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter patient residential address"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                to="/health-worker/patients"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
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
                    <span>Creating Patient...</span>
                  </>
                ) : (
                  <span>Create Patient</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default HealthWorkerNewPatientPage;
