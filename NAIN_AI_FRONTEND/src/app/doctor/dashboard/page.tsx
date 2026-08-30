import { useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../../../services/auth";

function DoctorDashboardPage() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome, {user?.first_name || user?.username || "Doctor"}!
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-700 focus:ring-2 focus:ring-red-200 focus:outline-none"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default DoctorDashboardPage;
