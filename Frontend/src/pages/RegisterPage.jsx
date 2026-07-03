import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

function RegisterPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/auth/register", {
        username: username,
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
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
      {/* ═══════════════════════════════════════════ */}
      {/* LEFT PANEL — Product showcase              */}
      {/* ═══════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-3/5 border-r border-white/5 flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Top — Brand — BIG & BOLD */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="text-2xl font-medium tracking-tight text-zinc-100">
            Intervue
          </span>
        </div>

        <div className="my-8 flex flex-col gap-4">
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/30">
            <div className="h-9 border-b border-white/5 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                  Rooms
                </span>
                <div className="h-px w-4 bg-white/10" />
                <span className="text-xs font-mono text-zinc-500">
                  3 active
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-500 border border-white/10 px-2 py-0.5 rounded-full">
                01
              </span>
            </div>

            <div className="divide-y divide-white/5">
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-100 font-light">
                    Frontend Interview
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    javascript · 2 people
                  </div>
                </div>
                <span className="text-zinc-600 text-sm">→</span>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-100 font-light">
                    Backend Round
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    python · 1 person
                  </div>
                </div>
                <span className="text-zinc-600 text-sm">→</span>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-zinc-100 font-light">
                    DSA Practice
                  </div>
                  <div className="text-xs font-mono text-zinc-500 mt-1">
                    cpp · 3 people
                  </div>
                </div>
                <span className="text-zinc-600 text-sm">→</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              <span className="uppercase tracking-widest">live</span>
            </div>
            <span className="text-zinc-700">·</span>
            <span className="uppercase tracking-widest">shared cursors</span>
            <span className="text-zinc-700">·</span>
            <span className="uppercase tracking-widest">6 langs</span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl xl:text-5xl font-light tracking-tight text-zinc-100 leading-none mb-4">
            Start hosting
            <br />
            <span className="text-zinc-600">interviews.</span>
          </h1>
          <p className="text-sm font-light leading-relaxed text-zinc-400 max-w-md">
            Create a room in seconds. Share a link. Run the whole interview in
            one place.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* RIGHT PANEL — Form                          */}
      {/* ═══════════════════════════════════════════ */}
      <div className="w-full lg:w-2/5 flex flex-col h-screen">
        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-8 py-6 overflow-y-auto">
          <div className="w-full max-w-sm">
            {/* Mobile brand */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="text-2xl font-medium tracking-tight text-zinc-100">
                Intervue
              </span>
            </div>

            {/* Section marker */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-xs font-mono text-zinc-500 border border-white/10 px-2 py-1 rounded-full">
                01
              </span>
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                Register
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-light tracking-tight text-zinc-100 leading-none mb-1.5">
              Create an account.
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              A few moments away from your first room.
            </p>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3.5 w-full"
            >
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-xs font-mono text-zinc-500 uppercase tracking-widest"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="John Doe"
                  required
                  minLength={3}
                  className="w-full bg-zinc-900 text-zinc-100 text-sm px-4 py-2.5 border border-white/10 rounded-lg placeholder:text-zinc-600 focus:border-white/20 transition-colors duration-150"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-mono text-zinc-500 uppercase tracking-widest"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-zinc-900 text-zinc-100 text-sm px-4 py-2.5 border border-white/10 rounded-lg placeholder:text-zinc-600 focus:border-white/20 transition-colors duration-150"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-mono text-zinc-500 uppercase tracking-widest"
                >
                  Password
                </label>
                <div className="relative w-full">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full bg-zinc-900 text-zinc-100 text-sm px-4 py-2.5 border border-white/10 rounded-lg placeholder:text-zinc-600 focus:border-white/20 transition-colors duration-150 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-100 text-xs font-mono uppercase tracking-widest transition-colors duration-150"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-zinc-400 bg-zinc-900 border border-white/10 px-4 py-2.5 rounded-lg font-mono">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-6 py-3 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>

              {/* Bottom link */}
              <p className="text-xs font-mono text-zinc-600 text-center mt-3">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-zinc-100 hover:text-white transition-colors duration-150"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 flex items-center justify-between px-8 border-t border-white/5 flex-shrink-0">
          <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
            v1.0.0
          </span>
          <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
            © {new Date().getFullYear()} Intervue
          </span>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
