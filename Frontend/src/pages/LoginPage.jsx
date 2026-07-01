import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore(function (state) {
    return state.setUser;
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async function (e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email,
        password: password,
      });

      const user = response.data.data.user;
      const token = response.data.data.token;

      setUser(user, token);
      navigate("/dashboard");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header — nav-bar style */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200">
        <span className="text-black text-sm font-semibold">intervue</span>

        <Link
          to="/register"
          className="text-gray-500 text-sm font-semibold hover:text-black transition-colors"
        >
          no account? <span className="text-black">register</span>
        </Link>
      </header>

      {/* Main — centered form */}
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">
          {/* Display heading */}
          <h1
            className="text-black font-normal mb-10"
            style={{ fontSize: "40px", letterSpacing: "-1px", lineHeight: "1" }}
          >
            Welcome back.
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
            {/* Email */}
            <div className="flex flex-col gap-2 w-full">
              <label htmlFor="email" className="text-black text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={function (e) {
                  setEmail(e.target.value);
                }}
                placeholder="you@example.com"
                required
                className="w-full bg-white text-black text-base py-3 border-b border-gray-300 placeholder:text-gray-400 focus:border-black transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2 w-full">
              <label
                htmlFor="password"
                className="text-black text-sm font-medium"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value);
                }}
                placeholder="••••••••"
                required
                className="w-full bg-white text-black text-base py-3 border-b border-gray-300 placeholder:text-gray-400 focus:border-black transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-black bg-gray-100 px-4 py-3 rounded-lg">
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 flex items-center px-8 border-t border-gray-200">
        <p className="text-gray-400 text-xs">
          © {new Date().getFullYear()} intervue
        </p>
      </footer>
    </div>
  );
}

export default LoginPage;
