import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

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
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
      {/* ═══════════════════════════════════════════ */}
      {/* LEFT PANEL — Product showcase              */}
      {/* ═══════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-3/5 border-r border-white/5 flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Top — Brand */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="text-2xl font-medium tracking-tight text-zinc-100">
            Intervue
          </span>
          <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest ml-2">
            v1.0.0
          </span>
        </div>

        {/* Middle — Editor preview + feature list */}
        <div className="my-8 flex flex-col gap-6">
          {/* Fake editor with interview-style code */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-900/30">
            <div className="h-9 border-b border-white/5 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                  Editor
                </span>
                <div className="h-px w-4 bg-white/10" />
                <span className="text-xs font-mono text-zinc-500">cpp</span>
              </div>

              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center text-[8px] font-mono border border-zinc-950">
                  AK
                </div>
                <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-100 flex items-center justify-center text-[8px] font-mono border border-zinc-950">
                  JS
                </div>
              </div>
            </div>

            <div className="p-5 font-mono text-[13px] leading-relaxed">
              <div className="text-zinc-600">
                1 <span className="text-zinc-500">// balanced binary tree</span>
              </div>
              <div className="text-zinc-600">
                2 <span className="text-zinc-400">class</span>{" "}
                <span className="text-zinc-100">Solution</span>{" "}
                <span className="text-zinc-500">{`{`}</span>
              </div>
              <div className="text-zinc-600">
                3 <span className="text-zinc-400">public</span>
                <span className="text-zinc-500">:</span>
              </div>
              <div className="text-zinc-600">
                4 <span className="text-zinc-400">bool</span>{" "}
                <span className="text-zinc-100">isBalanced</span>
                <span className="text-zinc-500">(</span>
                <span className="text-zinc-400">TreeNode</span>
                <span className="text-zinc-500">*</span> root
                <span className="text-zinc-500">)</span>{" "}
                <span className="text-zinc-500">{`{`}</span>
              </div>
              <div className="text-zinc-600">
                5 <span className="text-zinc-400">if</span>{" "}
                <span className="text-zinc-500">(!</span>root
                <span className="text-zinc-500">)</span>{" "}
                <span className="text-zinc-400">return</span>{" "}
                <span className="text-zinc-100">true</span>
                <span className="text-zinc-500">;</span>
              </div>
              <div className="text-zinc-600">
                6 <span className="text-zinc-400">int</span>{" "}
                <span className="text-zinc-100">lh</span>{" "}
                <span className="text-zinc-500">=</span>{" "}
                <span className="text-zinc-100">height</span>
                <span className="text-zinc-500">(</span>root
                <span className="text-zinc-500">-&gt;</span>left
                <span className="text-zinc-500">);</span>
              </div>
              <div className="text-zinc-600">
                7 <span className="text-zinc-400">int</span>{" "}
                <span className="text-zinc-100">rh</span>{" "}
                <span className="text-zinc-500">=</span>{" "}
                <span className="text-zinc-100">height</span>
                <span className="text-zinc-500">(</span>root
                <span className="text-zinc-500">-&gt;</span>right
                <span className="text-zinc-500">);</span>
              </div>
              <div className="text-zinc-600">
                8 <span className="text-zinc-400">return</span> abs
                <span className="text-zinc-500">(</span>lh{" "}
                <span className="text-zinc-500">-</span> rh
                <span className="text-zinc-500">)</span>{" "}
                <span className="text-zinc-500">&lt;=</span>{" "}
                <span className="text-zinc-100">1</span>
                <span className="text-zinc-500">;</span>
              </div>
              <div className="text-zinc-600">
                9 <span className="text-zinc-500">{`}`}</span>
              </div>
              <div className="text-zinc-600">
                10 <span className="text-zinc-500">{`};`}</span>
              </div>
            </div>
          </div>

          {/* Real feature list — replaces fake metadata */}
          <div className="flex flex-col gap-2.5">
            <FeatureRow>Real-time collaborative editor</FeatureRow>
            <FeatureRow>Live cursors with user awareness</FeatureRow>
            <FeatureRow>Sandboxed code execution · 6 languages</FeatureRow>
            <FeatureRow>Shared problem statement + chat</FeatureRow>
          </div>
        </div>

        {/* Bottom — Tagline */}
        <div>
          <h1 className="text-4xl xl:text-5xl font-light tracking-tight text-zinc-100 leading-none mb-4">
            Collaborative
            <br />
            <span className="text-zinc-500">interviews.</span>
          </h1>
          <p className="text-sm font-light leading-relaxed text-zinc-400 max-w-md">
            Create. Invite. Interview.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* RIGHT PANEL — Form                          */}
      {/* ═══════════════════════════════════════════ */}
      <div className="w-full lg:w-2/5 flex flex-col h-screen">
        {/* Form container */}
        <div className="flex-1 flex items-center justify-center px-8 py-8 overflow-y-auto">
          <div className="w-full max-w-sm">
            {/* Mobile brand */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <span className="text-2xl font-medium tracking-tight text-zinc-100">
                Intervue
              </span>
            </div>

            {/* Section marker — no step number */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                Sign in
              </span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Heading */}
            <h2 className="text-3xl font-light tracking-tight text-zinc-100 leading-none mb-2">
              Welcome back.
            </h2>
            <p className="text-sm text-zinc-500 mb-8">Sign in to continue.</p>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 w-full"
            >
              {/* Email */}
              <div className="flex flex-col gap-2">
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
                  required
                  className="w-full bg-zinc-900 text-zinc-100 text-sm px-4 py-3 border border-white/10 rounded-lg placeholder:text-zinc-600 focus:border-white/20 transition-colors duration-150"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
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
                    required
                    className="w-full bg-zinc-900 text-zinc-100 text-sm px-4 py-3 border border-white/10 rounded-lg placeholder:text-zinc-600 focus:border-white/20 transition-colors duration-150 pr-16"
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
                <p className="text-xs text-zinc-400 bg-zinc-900 border border-white/10 px-4 py-3 rounded-lg font-mono">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 text-xs font-normal tracking-widest text-zinc-100 uppercase border border-white/10 bg-white/5 px-6 py-3.5 rounded-full hover:bg-white/10 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>

              {/* Bottom link */}
              <p className="text-xs font-mono text-zinc-600 text-center mt-3">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-zinc-100 hover:text-white transition-colors duration-150"
                >
                  Register
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

/* ── Small helper — feature checkmark row ── */
function FeatureRow({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-500 text-sm font-mono">✓</span>
      <span className="text-sm text-zinc-400 font-light">{children}</span>
    </div>
  );
}

export default LoginPage;
