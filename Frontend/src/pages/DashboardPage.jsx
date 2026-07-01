import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

function DashboardPage() {
  const navigate = useNavigate();

  // Get user + actions from Zustand
  const user = useAuthStore(function (state) {
    return state.user;
  });
  const setUser = useAuthStore(function (state) {
    return state.setUser;
  });
  const logout = useAuthStore(function (state) {
    return state.logout;
  });

  const [isLoading, setIsLoading] = useState(true);

  // On page load — fetch current user info
  // Because Zustand resets on refresh, we need to restore user data
  useEffect(function () {
    const fetchUser = async function () {
      try {
        const response = await api.get("/auth/me");
        const userData = response.data.data.user;
        const token = localStorage.getItem("token");
        setUser(userData, token);
      } catch (err) {
        // Token invalid or expired → logout
        console.log("Fetch user error:", err.message);
        logout();
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Handle sign out button
  const handleSignOut = function () {
    logout();
    navigate("/login");
  };

  // Show loading state while fetching user
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar — consistent with login/register */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200">
        <span className="text-black text-sm font-semibold">intervue</span>

        <div className="flex items-center gap-6">
          <span className="text-gray-500 text-sm">{user && user.username}</span>
          <button
            onClick={handleSignOut}
            className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
          >
            sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-8 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Section header — heading + primary action */}
          <div className="flex items-center justify-between mb-12">
            <h1
              className="text-black font-normal"
              style={{
                fontSize: "40px",
                letterSpacing: "-1px",
                lineHeight: "1",
              }}
            >
              Your rooms.
            </h1>

            <button className="h-10 px-6 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors">
              + New room
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 mb-8"></div>

          {/* Placeholder for room list */}
          <div className="text-gray-400 text-sm py-16 text-center">
            No rooms yet. Create your first room to get started.
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
