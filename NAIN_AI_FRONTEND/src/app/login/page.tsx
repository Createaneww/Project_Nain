import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  getUserProfile,
  isAuthenticated,
  getStoredUser,
  getDashboardPathForRole,
} from "../../services/auth";

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to appropriate role dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getStoredUser();
      if (user) {
        navigate(getDashboardPathForRole(user.role), { replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Obtain JWT tokens
      const tokenData = await loginUser({
        username: trimmedUsername,
        password,
      });

      localStorage.setItem("access_token", tokenData.access);
      localStorage.setItem("refresh_token", tokenData.refresh);

      // 2. Fetch authenticated user profile and role
      const userProfile = await getUserProfile(tokenData.access);
      localStorage.setItem("user", JSON.stringify(userProfile));

      // 3. Redirect based on actual user role
      navigate(getDashboardPathForRole(userProfile.role), { replace: true });
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">NAIN AI</h1>
          <p className="mt-2 text-sm text-slate-500">
            Diabetic Retinopathy Screening System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                <span>Signing In...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;