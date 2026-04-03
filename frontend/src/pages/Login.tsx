import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { isApiError } from "../api";
import { useAuth, type SignupRole } from "../context/AuthContext";

const apiBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

export function Login() {
  const { login, verifyLoginOtp, resendLoginOtp, user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [searchParams] = useSearchParams();
  const urlError = searchParams.get("error");
  const urlErrorMessage =
    urlError === "google"
      ? "Google sign-in did not complete. Try again or use email and password."
      : urlError === "session"
        ? "Your API could not confirm this browser session. On Vercel set VITE_API_URL to your backend URL. On Render set CLIENT_ORIGIN to this site’s origin (comma-separated if you use previews)."
        : "";
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [oauthRole, setOauthRole] = useState<SignupRole>("CONSUMER");
  const [err, setErr] = useState("");
  const [sentHint, setSentHint] = useState(false);
  const [resending, setResending] = useState(false);

  if (user) {
    return <Navigate to={loc.state?.from || "/translator"} replace />;
  }

  const dest = loc.state?.from || "/translator";

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSentHint(false);
    try {
      const result = await login(email, password);
      if (result?.needsLoginOtp) {
        setStep("otp");
        setLoginCode("");
        return;
      }
      nav(dest, { replace: true });
    } catch (e2) {
      if (isApiError(e2) && e2.code === "EMAIL_NOT_VERIFIED") {
        nav(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true });
        return;
      }
      setErr(e2 instanceof Error ? e2.message : "Login failed");
    }
  }

  async function onOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await verifyLoginOtp(email.trim(), loginCode.replace(/\s/g, ""));
      nav(dest, { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Invalid or expired code");
    }
  }

  async function onResendLoginOtp() {
    if (!email.trim() || !password) return;
    setErr("");
    setResending(true);
    try {
      await resendLoginOtp(email.trim(), password);
      setSentHint(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  function backToPassword() {
    setStep("password");
    setErr("");
    setSentHint(false);
    setLoginCode("");
  }

  const googleBase = apiBase ? `${apiBase}/auth/google` : "/auth/google";
  const googleHref = `${googleBase}?role=${encodeURIComponent(oauthRole)}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-lh-border bg-white p-8 shadow-sm">
        {step === "otp" ? (
          <>
            <h1 className="text-2xl font-bold text-lh-blue">Check your email</h1>
            <p className="mt-1 text-sm text-lh-muted">
              We sent a 6-digit sign-in code to <span className="font-medium text-lh-ink">{email}</span>. It
              expires in 15 minutes.
            </p>

            <form onSubmit={onOtpSubmit} className="mt-8 space-y-4">
              <div>
                <label className="text-xs font-semibold text-lh-muted">Code</label>
                <input
                  className="mt-1 w-full rounded-lg border border-lh-border px-3 py-2 text-sm tracking-widest outline-none ring-lh-blue focus:ring-2"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={8}
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              {sentHint && (
                <p className="text-sm text-green-700">If your password is correct, a new code was sent.</p>
              )}
              <button
                type="submit"
                className="w-full rounded-lg bg-lh-blue py-2.5 text-sm font-semibold text-white hover:bg-lh-blue-hover"
              >
                Verify and sign in
              </button>
            </form>

            <button
              type="button"
              disabled={resending || !email.trim() || !password}
              onClick={onResendLoginOtp}
              className="mt-3 w-full rounded-lg border border-lh-border py-2.5 text-sm font-semibold text-lh-ink hover:bg-lh-surface disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>

            <button
              type="button"
              onClick={backToPassword}
              className="mt-3 w-full text-sm font-semibold text-lh-blue hover:underline"
            >
              Back to password
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-lh-blue">Welcome back</h1>
            <p className="mt-1 text-sm text-lh-muted">Sign in to LingoHub AI</p>
            {urlErrorMessage && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {urlErrorMessage}
              </p>
            )}

            <form onSubmit={onPasswordSubmit} className="mt-8 space-y-4">
              <div>
                <label className="text-xs font-semibold text-lh-muted">Email</label>
                <input
                  className="mt-1 w-full rounded-lg border border-lh-border px-3 py-2 text-sm outline-none ring-lh-blue focus:ring-2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-lh-muted">Password</label>
                <input
                  className="mt-1 w-full rounded-lg border border-lh-border px-3 py-2 text-sm outline-none ring-lh-blue focus:ring-2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-lh-blue py-2.5 text-sm font-semibold text-white hover:bg-lh-blue-hover"
              >
                Sign in
              </button>
            </form>

            <div className="mt-4 rounded-lg border border-lh-border bg-lh-surface/80 p-3">
              <p className="text-xs font-semibold text-lh-muted">New Google sign-up — account type</p>
              <select
                value={oauthRole}
                onChange={(e) => setOauthRole(e.target.value as SignupRole)}
                className="lh-select mt-2 w-full rounded-lg border border-lh-border bg-white py-2 ps-3 pe-11 text-sm outline-none ring-lh-blue focus:ring-2"
              >
                <option value="CONSUMER">Consumer (request translations)</option>
                <option value="TRANSLATOR">Translator</option>
                <option value="REVIEWER">Reviewer</option>
              </select>
            </div>

            <a
              href={googleHref}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-lh-border py-2.5 text-sm font-semibold text-lh-ink hover:bg-lh-surface"
            >
              <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </a>

            <p className="mt-6 text-center text-sm text-lh-muted">
              No account?{" "}
              <Link className="font-semibold text-lh-blue hover:underline" to="/register">
                Create one
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
