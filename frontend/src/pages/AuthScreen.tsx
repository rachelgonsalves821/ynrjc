import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiUrl } from "../lib/api";

const LANGUAGES = [
  "Japanese",
  "Spanish",
  "French",
  "German",
  "Korean",
  "Mandarin",
  "Arabic",
  "Hindi",
] as const;

interface AuthResponse {
  user?: {
    id: string;
    email?: string;
    target_language?: string;
    level?: number;
    proficiency_level?: number;
  };
  session?: { access_token: string };
  token?: string;
  error?: string;
}

function persistAuth(data: AuthResponse, fallbackTargetLanguage?: string) {
  const token = data.session?.access_token ?? data.token;
  if (!token) {
    throw new Error("No access token in response");
  }
  const user = data.user;
  if (!user?.id) {
    throw new Error("Invalid user in response");
  }

  const target_language =
    user.target_language ?? fallbackTargetLanguage ?? "Japanese";

  const profile = {
    id: user.id,
    email: user.email ?? "",
    target_language,
    proficiency_level:
      typeof user.proficiency_level === "number"
        ? user.proficiency_level
        : typeof user.level === "number"
        ? user.level
        : undefined,
  };

  localStorage.setItem("token", token);
  localStorage.setItem("profile", JSON.stringify(profile));
}

function GoogleIcon() {
  return (
    <svg className="lu-auth-google-svg" width={20} height={20} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function AuthScreen() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Japanese");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { syncFromStorage } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = tab === "login" ? "/auth/login" : "/auth/signup";
      const body =
        tab === "login"
          ? { email, password }
          : { email, password, target_language: targetLanguage };

      const res = await fetch(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as AuthResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      persistAuth(data, targetLanguage);
      syncFromStorage();
      navigate("/input", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lu-auth-page">
      <div className="lu-auth-glow lu-auth-glow--tr" aria-hidden />
      <div className="lu-auth-glow lu-auth-glow--bl" aria-hidden />

      <header className="lu-auth-brand">
        <h1>LangUp</h1>
        <p>Learn languages through real content.</p>
      </header>

      <main className="lu-auth-main">
        <div className="lu-auth-card">
          <div className="lu-auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "login"}
              className={`lu-auth-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => {
                setTab("login");
                setError("");
              }}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signup"}
              className={`lu-auth-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => {
                setTab("signup");
                setError("");
              }}
            >
              Sign Up
            </button>
          </div>

          <div className="lu-auth-body">
            <form onSubmit={handleSubmit}>
              <div className="lu-auth-field">
                <label htmlFor="lu-email">Email</label>
                <input
                  id="lu-email"
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <div className="lu-auth-field">
                <label htmlFor="lu-password">Password</label>
                <input
                  id="lu-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  minLength={6}
                  autoComplete={
                    tab === "login" ? "current-password" : "new-password"
                  }
                />
              </div>

              {tab === "signup" && (
                <div className="lu-auth-field">
                  <label htmlFor="lu-target">I want to learn</label>
                  <select
                    id="lu-target"
                    value={targetLanguage}
                    onChange={(e) => {
                      setTargetLanguage(e.target.value);
                      setError("");
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" className="lu-auth-submit" disabled={loading}>
                {loading
                  ? "Please wait…"
                  : tab === "login"
                  ? "Login"
                  : "Create account"}
              </button>
            </form>

            <div className="lu-auth-error">{error || "\u00a0"}</div>

            <div className="lu-auth-divider">
              <span>or continue with</span>
            </div>

            <button
              type="button"
              className="lu-auth-google"
              onClick={() =>
                setError("Google sign-in is not wired yet — use email for now.")
              }
            >
              <GoogleIcon />
              Google
            </button>
          </div>
        </div>

        <div className="lu-auth-links">
          <a href="#forgot" onClick={(e) => e.preventDefault()}>
            Forgot password?
          </a>
          <div className="lu-auth-links-right">
            <a href="#help" onClick={(e) => e.preventDefault()}>
              Help
            </a>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              Privacy
            </a>
          </div>
        </div>
      </main>

      <footer className="lu-auth-footer">
        <div className="lu-auth-footer-brand">LangUp</div>
        <div className="lu-auth-footer-links">
          <a href="#pp" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
          <a href="#tos" onClick={(e) => e.preventDefault()}>
            Terms of Service
          </a>
          <a href="#support" onClick={(e) => e.preventDefault()}>
            Support
          </a>
          <a href="#contact" onClick={(e) => e.preventDefault()}>
            Contact
          </a>
        </div>
        <p className="lu-auth-footer-copy">
          © {new Date().getFullYear()} LangUp. The Focused Luminary.
        </p>
      </footer>
    </div>
  );
}
