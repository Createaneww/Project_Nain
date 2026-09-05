import { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { verifyPasswordResetToken, confirmPasswordReset } from "../../services/auth";
import { IrisVisual } from "../../components/IrisVisual";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [accountUsername, setAccountUsername] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Verify token on initial mount
  useEffect(() => {
    async function checkToken() {
      if (!uid || !token) {
        setTokenValid(false);
        setVerifying(false);
        return;
      }

      try {
        const res = await verifyPasswordResetToken(uid, token);
        if (res.valid) {
          setTokenValid(true);
          setAccountUsername(res.username || null);
        } else {
          setTokenValid(false);
          setError(res.detail || "Password reset token is invalid or has expired.");
        }
      } catch {
        setTokenValid(false);
        setError("Unable to verify reset token. Please check your network connection.");
      } finally {
        setVerifying(false);
      }
    }

    checkToken();
  }, [uid, token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col lg:flex-row"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", background: "#F7F9FF" }}
    >

      {/* ════════════════════════════════════════════════════════════════
          LEFT SECTION: Visual Branding & Information
      ════════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full lg:w-[52%] xl:w-[50%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 text-white min-h-[380px] lg:min-h-screen shrink-0 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #061529 0%, #0B2045 55%, #0F2A5C 100%)" }}
      >
        {/* Brand Header */}
        <header className="animate-fade-slide-right">
          <Link to="/login" className="inline-flex items-center gap-3.5 group" style={{ textDecoration: "none" }}>
            {/* Eye / Iris Logo Mark */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
              }}
              aria-hidden="true"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12C2 12 5.5 6 12 6C18.5 6 22 12 22 12C22 12 18.5 18 12 18C5.5 18 2 12 2 12Z"
                  stroke="#93C5FD"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="3.5" stroke="#BFDBFE" strokeWidth="1.75" />
                <circle cx="12" cy="12" r="1.3" fill="#FFFFFF" />
              </svg>
            </div>

            <div>
              <div
                className="text-white font-extrabold leading-tight"
                style={{
                  fontSize: "1.75rem",
                  letterSpacing: "-0.025em",
                }}
              >
                NAIN AI
              </div>
              <div
                className="text-blue-200/90 font-semibold uppercase"
                style={{
                  fontSize: "0.625rem",
                  letterSpacing: "0.14em",
                }}
              >
                Diabetic Retinopathy Screening
              </div>
            </div>
          </Link>
        </header>

        {/* Hero: IrisVisual + Tagline */}
        <div className="my-auto py-8 lg:py-0 animate-fade-slide-up delay-100 flex flex-col items-start">
          <div className="w-full flex items-center justify-center mb-8" style={{ height: "min(280px, 38vw)" }}>
            <IrisVisual />
          </div>

          <h1
            className="text-white font-extrabold leading-tight"
            style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.25rem)", letterSpacing: "-0.02em" }}
          >
            New Password.{" "}
            <span style={{ color: "#93C5FD" }}>Protected Account.</span>
          </h1>

          <p
            className="mt-3 max-w-sm font-normal leading-relaxed"
            style={{ fontSize: "0.9rem", color: "rgba(224, 231, 255, 0.80)" }}
          >
            Choose a strong, secure password to complete your account recovery and protect clinical screening data.
          </p>

          <div className="flex flex-wrap gap-2 mt-5">
            {["Cryptographic Token", "Instant Credential Sync"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#EFF6FF", backdropFilter: "blur(6px)" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <footer className="text-xs text-blue-200/70 font-medium tracking-wide animate-fade-in delay-200">
          Smart India Hackathon &bull; Healthcare Platform
        </footer>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT SECTION: Password Reset Form on White Canvas
      ════════════════════════════════════════════════════════════════ */}
      <div className="relative flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16" style={{ background: "#F7F9FF" }}>
        <div
          className="w-full max-w-[420px] animate-fade-slide-up delay-150"
          style={{ padding: "0 0.5rem" }}
        >
          {/* Back to Sign In Link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 mb-6 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to Sign In</span>
          </Link>

          {/* Initial Token Verifying Spinner */}
          {verifying ? (
            <div className="py-12 text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 border border-blue-100 mx-auto">
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Verifying security token...</p>
              <p className="text-xs text-slate-400">Validating password reset authorization</p>
            </div>
          ) : success ? (
            /* Success State */
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Password reset!
                </h2>
                <p className="mt-2 text-sm text-slate-500 font-normal leading-relaxed">
                  Your credentials have been securely updated.
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-900 mb-0.5">Update Successful</h4>
                  <p className="text-xs text-emerald-800/90 leading-relaxed">
                    You can now sign in to NAIN AI using your new password.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)",
                  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.32)",
                }}
              >
                <span>Return to Sign In</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : !tokenValid ? (
            /* Invalid / Expired Token State */
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Link expired
                </h2>
                <p className="mt-2 text-sm text-slate-500 font-normal leading-relaxed">
                  This password reset link is invalid or has already been used.
                </p>
              </div>

              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-red-900 mb-0.5">Invalid Security Token</h4>
                  <p className="text-xs text-red-800/90 leading-relaxed">
                    {error || "For security reasons, reset links expire quickly. Please request a new one."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to="/forgot-password"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white transition-all duration-200 text-center"
                  style={{
                    background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)",
                    boxShadow: "0 4px 16px rgba(37, 99, 235, 0.32)",
                  }}
                >
                  <span>Request New Link</span>
                </Link>
                <Link
                  to="/login"
                  className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-center"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Reset Form */
            <div className="animate-fade-in">
              <div className="mb-8">
                <h2
                  className="text-slate-900 font-bold leading-tight"
                  style={{
                    fontSize: "1.75rem",
                    letterSpacing: "-0.025em",
                  }}
                >
                  Reset password
                </h2>
                <p
                  className="mt-2 text-slate-500 font-normal leading-relaxed"
                  style={{ fontSize: "0.875rem" }}
                >
                  Choose a new password for account {accountUsername ? <strong className="text-slate-800 font-semibold">@{accountUsername}</strong> : "NAIN AI"}.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div
                  className="mb-6 flex items-start gap-3 rounded-xl p-4 animate-fade-in"
                  role="alert"
                  style={{
                    background: "#FFF1F2",
                    border: "1px solid #FECDD3",
                    fontSize: "0.825rem",
                  }}
                >
                  <svg
                    className="shrink-0 mt-0.5"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#E11D48"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ color: "#BE123C", fontWeight: 500, lineHeight: 1.45 }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                      aria-hidden="true"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      disabled={loading}
                      autoComplete="new-password"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        paddingLeft: "2.6rem",
                        paddingRight: "2.8rem",
                        paddingTop: "0.75rem",
                        paddingBottom: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#0F172A",
                        background: "#F8FAFC",
                        border: "1.5px solid #E2E8F0",
                        borderRadius: "12px",
                        outline: "none",
                        transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2563EB";
                        e.target.style.boxShadow = "0 0 0 3.5px rgba(37, 99, 235, 0.12)";
                        e.target.style.background = "#FFFFFF";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#E2E8F0";
                        e.target.style.boxShadow = "none";
                        e.target.style.background = "#F8FAFC";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading}
                      tabIndex={-1}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showNewPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M1 1l22 22" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                      aria-hidden="true"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      disabled={loading}
                      autoComplete="new-password"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        paddingLeft: "2.6rem",
                        paddingRight: "2.8rem",
                        paddingTop: "0.75rem",
                        paddingBottom: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#0F172A",
                        background: "#F8FAFC",
                        border: "1.5px solid #E2E8F0",
                        borderRadius: "12px",
                        outline: "none",
                        transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2563EB";
                        e.target.style.boxShadow = "0 0 0 3.5px rgba(37, 99, 235, 0.12)";
                        e.target.style.background = "#FFFFFF";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#E2E8F0";
                        e.target.style.boxShadow = "none";
                        e.target.style.background = "#F8FAFC";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showConfirmPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M1 1l22 22" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 mt-1">
                  <div className={`flex items-center gap-2 ${newPassword.length >= 8 ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={newPassword.length >= 8 ? "M5 13l4 4L19 7" : "M12 8v4m0 4h.01"} />
                    </svg>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${newPassword && confirmPassword && newPassword === confirmPassword ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={newPassword && confirmPassword && newPassword === confirmPassword ? "M5 13l4 4L19 7" : "M12 8v4m0 4h.01"} />
                    </svg>
                    <span>Passwords match</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold text-white transition-all duration-200"
                  style={{
                    background: loading
                      ? "#93C5FD"
                      : "linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)",
                    boxShadow: loading ? "none" : "0 4px 16px rgba(37, 99, 235, 0.32)",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(-1px)";
                      el.style.boxShadow = "0 6px 20px rgba(37, 99, 235, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "translateY(0)";
                    el.style.boxShadow = "0 4px 16px rgba(37, 99, 235, 0.32)";
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <span>Updating Password…</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Security Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Secured with end-to-end encrypted authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
