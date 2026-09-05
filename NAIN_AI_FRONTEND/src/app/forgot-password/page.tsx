import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/auth";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    // Basic client-side email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(trimmedEmail);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8"
      style={{
        background: "linear-gradient(135deg, #134DB8 0%, #195EC9 50%, #206DE0 100%)",
        fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          MAIN AUTHENTICATION CARD CONTAINER (Exact match with Login)
      ───────────────────────────────────────────────────────────── */}
      <div
        className="w-full max-w-[1140px] min-h-screen sm:min-h-[640px] lg:h-[680px] bg-white sm:rounded-[32px] overflow-hidden relative shadow-[0_25px_70px_rgba(8,30,85,0.4)] flex flex-col lg:flex-row"
      >
        {/* ───────────────────────────────────────────────────────────
            BACKGROUND SVG COMPOSITION:
            - Organic Curved Blue Boundary (Left to Center)
            - 3D-Shaded Royal Blue Decorative Spheres/Circles
        ─────────────────────────────────────────────────────────── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
          viewBox="0 0 1140 680"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Primary smooth blue gradient for left section */}
            <linearGradient id="fpMainBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#124EB8" />
              <stop offset="50%" stopColor="#1B62D6" />
              <stop offset="100%" stopColor="#256CE8" />
            </linearGradient>

            {/* Bottom-left dark sphere gradient */}
            <radialGradient id="fpSphereDarkGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2464D9" />
              <stop offset="55%" stopColor="#144CA8" />
              <stop offset="100%" stopColor="#0B3072" />
            </radialGradient>

            {/* Bottom-center floating sphere gradient */}
            <radialGradient id="fpSphereFloatingGrad" cx="32%" cy="30%" r="68%">
              <stop offset="0%" stopColor="#5599FD" />
              <stop offset="35%" stopColor="#2872EC" />
              <stop offset="75%" stopColor="#1651B8" />
              <stop offset="100%" stopColor="#0C3480" />
            </radialGradient>

            {/* Bottom-right accent sphere gradient */}
            <radialGradient id="fpSphereRightGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="60%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </radialGradient>

            {/* Drop shadow filter for 3D sphere */}
            <filter id="fpSphereShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="4" dy="16" stdDeviation="16" floodColor="#0A2C6E" floodOpacity="0.32" />
            </filter>
          </defs>

          {/* 1. Large Organic Blue Left Shape with smooth convex curve boundary */}
          <path
            d="M 0,0 L 530,0 C 600,160 590,320 500,480 C 430,590 340,650 200,680 L 0,680 Z"
            fill="url(#fpMainBlueGrad)"
          />

          {/* 2. Bottom-left partially cropped dark blue sphere */}
          <circle cx="20" cy="620" r="180" fill="url(#fpSphereDarkGrad)" />

          {/* 3. Bottom-center floating 3D sphere overlapping the curve boundary */}
          <circle
            cx="390"
            cy="520"
            r="120"
            fill="url(#fpSphereFloatingGrad)"
            filter="url(#fpSphereShadow)"
          />

          {/* 4. Bottom-right subtle accent sphere */}
          <circle cx="1120" cy="640" r="110" fill="url(#fpSphereRightGrad)" opacity="0.92" />
        </svg>

        {/* Mobile/Tablet Blue Header Visual (Shown only on < 1024px screens) */}
        <div
          className="lg:hidden relative w-full overflow-hidden p-6 sm:p-8 shrink-0 text-white"
          style={{
            background: "linear-gradient(145deg, #124EB8 0%, #1B62D6 60%, #256CE8 100%)",
          }}
        >
          {/* Decorative circles on mobile */}
          <div
            className="absolute -right-8 -bottom-10 w-36 h-36 rounded-full pointer-events-none opacity-40"
            style={{
              background: "radial-gradient(circle at 35% 35%, #93C5FD 0%, #1D4ED8 100%)",
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M2 12C2 12 5.5 6 12 6C18.5 6 22 12 22 12C22 12 18.5 18 12 18C5.5 18 2 12 2 12Z"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="#FFFFFF" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="1.2" fill="#FFFFFF" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight">NAIN AI</span>
                <span className="block text-[9px] uppercase tracking-widest text-blue-200 font-semibold">
                  Diabetic Retinopathy Screening
                </span>
              </div>
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Account Recovery
            </h2>
            <p className="text-xs text-blue-100/80 mt-1 max-w-sm">
              We'll send you a secure link to reset your account password.
            </p>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            LEFT SECTION (Desktop): Branding & Headline
        ─────────────────────────────────────────────────────────── */}
        <div
          className="relative hidden lg:flex w-[46%] xl:w-[44%] h-full flex-col justify-between p-10 xl:p-14 text-white z-10 select-none"
        >
          {/* Top Brand Identity */}
          <div>
            <Link to="/login" className="flex items-center gap-3 group text-white decoration-transparent">
              <div
                className="flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.16)",
                  border: "1.2px solid rgba(255, 255, 255, 0.32)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M2 12C2 12 5.5 6 12 6C18.5 6 22 12 22 12C22 12 18.5 18 12 18C5.5 18 2 12 2 12Z"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3.2" stroke="#FFFFFF" strokeWidth="1.8" />
                  <circle cx="12" cy="12" r="1.2" fill="#FFFFFF" />
                </svg>
              </div>

              <div>
                <h1
                  className="font-extrabold tracking-tight leading-none text-white"
                  style={{ fontSize: "1.65rem", margin: 0 }}
                >
                  NAIN AI
                </h1>
                <p
                  className="font-bold uppercase tracking-widest text-blue-100/90"
                  style={{ fontSize: "0.62rem", marginTop: "3px", letterSpacing: "0.14em", margin: 0 }}
                >
                  DIABETIC RETINOPATHY SCREENING
                </p>
              </div>
            </Link>
          </div>

          {/* Middle Headline / Value Prop */}
          <div className="my-auto py-6" style={{ maxWidth: "340px" }}>
            <div
              className="text-white font-extrabold tracking-tight"
              style={{
                fontSize: "clamp(2rem, 3.2vw, 2.75rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
              }}
            >
              Account Recovery.
            </div>
            <div
              className="font-extrabold tracking-tight text-blue-100"
              style={{
                fontSize: "clamp(1.75rem, 2.6vw, 2.3rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
                marginTop: "4px",
              }}
            >
              Fast &amp; Secure.
            </div>

            <p
              className="text-blue-100/90 font-normal leading-relaxed"
              style={{ fontSize: "0.92rem", marginTop: "16px", maxWidth: "310px" }}
            >
              Enter your verified email address to receive password reset instructions.
            </p>
          </div>

          {/* Bottom Branding Tag */}
          <div
            className="text-blue-200/70 font-semibold tracking-wide"
            style={{ fontSize: "0.72rem" }}
          >
            Smart India Hackathon &bull; Healthcare Innovation
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            RIGHT SECTION: Clean White Form Area
        ─────────────────────────────────────────────────────────── */}
        <div
          className="relative flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 bg-white z-10"
        >
          <div className="w-full max-w-[360px]">
            {/* Header */}
            <div className="mb-7">
              <h2
                className="font-extrabold text-[#0B1E48] tracking-tight"
                style={{ fontSize: "1.85rem", lineHeight: 1.2, margin: 0 }}
              >
                Forgot Password?
              </h2>
              <p
                className="text-slate-500 font-medium"
                style={{ fontSize: "0.875rem", marginTop: "6px" }}
              >
                Enter your registered email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium"
              >
                <svg
                  className="shrink-0 mt-0.5"
                  width="15"
                  height="15"
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
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {submitted ? (
              /* ── Success State ── */
              <div className="flex flex-col gap-4">
                <div
                  className="flex items-start gap-3.5 rounded-2xl p-5 border border-emerald-200 bg-emerald-50/80"
                >
                  <div
                    className="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 mt-0.5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 mb-1">
                      Reset Link Sent
                    </h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      If an account exists for <strong className="font-semibold text-emerald-950">{email}</strong>, we have dispatched password reset instructions.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 text-center pt-1">
                  Didn't receive an email? Please check your spam folder or verify your email.
                </p>

                <Link
                  to="/login"
                  className="w-full mt-2 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] text-center"
                  style={{
                    background: "#103E8F",
                    boxShadow: "0 6px 18px rgba(16, 62, 143, 0.35)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "#0C3278";
                    el.style.boxShadow = "0 8px 22px rgba(16, 62, 143, 0.45)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "#103E8F";
                    el.style.boxShadow = "0 6px 18px rgba(16, 62, 143, 0.35)";
                  }}
                >
                  Return to Sign In
                </Link>
              </div>
            ) : (
              /* ── Form State ── */
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center"
                      aria-hidden="true"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      disabled={loading}
                      autoComplete="email"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        height: "46px",
                        paddingLeft: "2.5rem",
                        paddingRight: "1rem",
                        fontSize: "0.875rem",
                        color: "#0F172A",
                        background: "#F1F5F9",
                        border: "1.5px solid #E2E8F0",
                        borderRadius: "12px",
                        outline: "none",
                        transition: "all 0.18s ease",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#1B62D6";
                        e.target.style.background = "#FFFFFF";
                        e.target.style.boxShadow = "0 0 0 3px rgba(27, 98, 214, 0.12)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#E2E8F0";
                        e.target.style.background = "#F1F5F9";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="forgot-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 h-12 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99]"
                  style={{
                    background: loading
                      ? "#93C5FD"
                      : "#103E8F",
                    boxShadow: loading ? "none" : "0 6px 18px rgba(16, 62, 143, 0.35)",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "#0C3278";
                      el.style.boxShadow = "0 8px 22px rgba(16, 62, 143, 0.45)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = "#103E8F";
                      el.style.boxShadow = "0 6px 18px rgba(16, 62, 143, 0.35)";
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      <span>Sending Link…</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>

                {/* Back to Sign In Link */}
                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors group"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="transition-transform group-hover:-translate-x-0.5"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
