import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";
import { toastSuccess, toastError } from "../lib/toast";

function RegisterPage() {
  var navigate = useNavigate();
  var setUser = useAuthStore(function (state) {
    return state.setUser;
  });

  var [view, setView] = useState("options");
  var [username, setUsername] = useState("");
  var [email, setEmail] = useState("");
  var [password, setPassword] = useState("");
  var [showPassword, setShowPassword] = useState(false);
  var [error, setError] = useState("");
  var [isLoading, setIsLoading] = useState(false);
  var [fadeClass, setFadeClass] = useState("opacity-0 translate-y-2");

  var usernameRef = useRef(null);
  var emailRef = useRef(null);
  var passwordRef = useRef(null);

  useEffect(function () {
    var timer = setTimeout(function () {
      setFadeClass("opacity-100 translate-y-0");
    }, 50);
    return function () {
      clearTimeout(timer);
    };
  }, []);

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function transitionTo(nextView) {
    setFadeClass("opacity-0 translate-y-2");
    setError("");

    setTimeout(function () {
      setView(nextView);
      setFadeClass("opacity-100 translate-y-0");

      setTimeout(function () {
        if (nextView === "username" && usernameRef.current) {
          usernameRef.current.focus();
        }
        if (nextView === "email" && emailRef.current) {
          emailRef.current.focus();
        }
        if (nextView === "password" && passwordRef.current) {
          passwordRef.current.focus();
        }
      }, 300);
    }, 200);
  }

  function handleUsernameContinue(e) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    transitionTo("email");
  }

  function handleEmailContinue(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    transitionTo("password");
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter a password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      var response = await api.post("/auth/register", {
        username: username,
        email: email,
        password: password,
      });

      var user = response.data.data.user;
      var token = response.data.data.token;

      setUser(user, token);
      toastSuccess(
        "ACCOUNT CREATED",
        "Welcome to Intervue, " + user.username + ".",
      );
      navigate("/dashboard");
    } catch (err) {
      var errorMsg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(errorMsg);
      toastError("REGISTRATION FAILED", errorMsg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 relative">
      {/* Main container */}
      <div
        className={
          "w-full max-w-[340px] flex flex-col items-center transition-all duration-500 ease-out " +
          fadeClass
        }
      >
        {/* Logo */}
        <div className="mb-8 select-none">
          <span className="text-ink text-[32px] font-semibold tracking-tight">
            Intervue<span className="text-primary">.</span>
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[18px] font-medium text-ink mb-8 tracking-tight">
          {view === "options" && "Create your Intervue account"}
          {view === "username" && "Pick a username"}
          {view === "email" && "What's your email?"}
          {view === "password" && "Create a password"}
        </h1>

        {/* ──── VIEW 1: OPTIONS ──── */}
        {view === "options" && (
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={function () {
                transitionTo("username");
              }}
              className="w-full bg-primary hover:bg-primary-hover text-white text-[14px] font-medium py-3 rounded-full transition-colors duration-150"
            >
              Continue with email
            </button>

            <button
              onClick={function () {
                navigate("/login");
              }}
              className="w-full bg-surface-1 hover:bg-surface-2 text-ink text-[14px] font-medium py-3 rounded-full border border-hairline transition-colors duration-150"
            >
              I already have an account
            </button>

            <p className="text-center mt-5 text-[13px] text-ink-subtle">
              Already registered?{" "}
              <Link
                to="/login"
                className="text-ink font-medium hover:text-primary transition-colors duration-150"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* ──── VIEW 2: USERNAME ──── */}
        {view === "username" && (
          <form
            onSubmit={handleUsernameContinue}
            className="w-full flex flex-col gap-2.5"
          >
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={function (e) {
                setUsername(e.target.value);
              }}
              placeholder="Choose a username"
              autoComplete="username"
              minLength={3}
              className="w-full bg-surface-1 border border-hairline text-ink text-[14px] px-4 py-3 rounded-full placeholder:text-ink-tertiary focus:outline-none focus:border-hairline-strong transition-colors duration-150 text-center"
            />

            {error && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500/70 flex-shrink-0" />
                <p className="text-[12px] text-ink-subtle">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white text-[14px] font-medium py-3 rounded-full transition-colors duration-150"
            >
              Continue
            </button>

            <button
              type="button"
              onClick={function () {
                transitionTo("options");
              }}
              className="w-full text-ink-subtle hover:text-ink text-[13px] font-medium py-2 transition-colors duration-150"
            >
              ← Back
            </button>
          </form>
        )}

        {/* ──── VIEW 3: EMAIL ──── */}
        {view === "email" && (
          <form
            onSubmit={handleEmailContinue}
            className="w-full flex flex-col gap-2.5"
          >
            {/* Username chip */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-surface-3 border border-hairline flex items-center justify-center">
                <span className="text-[9px] font-mono text-ink-muted uppercase">
                  {username.charAt(0)}
                </span>
              </div>
              <span className="text-[13px] text-ink-muted truncate max-w-[240px]">
                {username}
              </span>
            </div>

            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={function (e) {
                setEmail(e.target.value);
              }}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-surface-1 border border-hairline text-ink text-[14px] px-4 py-3 rounded-full placeholder:text-ink-tertiary focus:outline-none focus:border-hairline-strong transition-colors duration-150 text-center"
            />

            {error && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500/70 flex-shrink-0" />
                <p className="text-[12px] text-ink-subtle">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white text-[14px] font-medium py-3 rounded-full transition-colors duration-150"
            >
              Continue
            </button>

            <button
              type="button"
              onClick={function () {
                transitionTo("username");
              }}
              className="w-full text-ink-subtle hover:text-ink text-[13px] font-medium py-2 transition-colors duration-150"
            >
              ← Back
            </button>
          </form>
        )}

        {/* ──── VIEW 4: PASSWORD ──── */}
        {view === "password" && (
          <form
            onSubmit={handleCreateAccount}
            className="w-full flex flex-col gap-2.5"
          >
            {/* Email chip */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-surface-3 border border-hairline flex items-center justify-center">
                <span className="text-[9px] font-mono text-ink-muted uppercase">
                  {email.charAt(0)}
                </span>
              </div>
              <span className="text-[13px] text-ink-muted truncate max-w-[240px]">
                {email}
              </span>
            </div>

            <div className="relative w-full">
              <input
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={function (e) {
                  setPassword(e.target.value);
                }}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                minLength={6}
                className="w-full bg-surface-1 border border-hairline text-ink text-[14px] px-4 py-3 pr-16 rounded-full placeholder:text-ink-tertiary focus:outline-none focus:border-hairline-strong transition-colors duration-150 text-center"
              />
              <button
                type="button"
                onClick={function () {
                  setShowPassword(!showPassword);
                }}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-ink-tertiary hover:text-ink uppercase tracking-wider transition-colors duration-150"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500/70 flex-shrink-0" />
                <p className="text-[12px] text-ink-subtle">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white text-[14px] font-medium py-3 rounded-full transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>

            <button
              type="button"
              onClick={function () {
                transitionTo("email");
              }}
              className="w-full text-ink-subtle hover:text-ink text-[13px] font-medium py-2 transition-colors duration-150"
            >
              ← Back
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-between px-6">
        <span className="text-[11px] font-mono text-ink-tertiary tracking-wider">
          v1.0.0
        </span>
        <span className="text-[11px] font-mono text-ink-tertiary tracking-wider">
          © {new Date().getFullYear()} Intervue
        </span>
      </div>
    </div>
  );
}

export default RegisterPage;
