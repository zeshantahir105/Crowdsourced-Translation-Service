import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function VerifyEmail() {
  const { user, verifyEmail, resendVerification } = useAuth();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() || "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [sentHint, setSentHint] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const q = searchParams.get("email")?.trim();
    if (q) setEmail(q);
  }, [searchParams]);

  if (user?.emailVerified) {
    return <Navigate to="/translator" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await verifyEmail(email.trim(), code.replace(/\s/g, ""));
      nav("/translator", { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Verification failed");
    }
  }

  async function onResend() {
    if (!email.trim()) return;
    setErr("");
    setResending(true);
    try {
      await resendVerification(email.trim());
      setSentHint(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not resend");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-2xl border border-lh-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-lh-blue">Verify your email</h1>
        <p className="mt-1 text-sm text-lh-muted">
          Enter the 6-digit code we sent. It expires in 15 minutes.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
            <label className="text-xs font-semibold text-lh-muted">Code</label>
            <input
              className="mt-1 w-full rounded-lg border border-lh-border px-3 py-2 text-sm tracking-widest outline-none ring-lh-blue focus:ring-2"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {sentHint && <p className="text-sm text-green-700">If that address is registered, a new code was sent.</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-lh-blue py-2.5 text-sm font-semibold text-white hover:bg-lh-blue-hover"
          >
            Verify and continue
          </button>
        </form>

        <button
          type="button"
          disabled={resending || !email.trim()}
          onClick={onResend}
          className="mt-3 w-full rounded-lg border border-lh-border py-2.5 text-sm font-semibold text-lh-ink hover:bg-lh-surface disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>

        <p className="mt-6 text-center text-sm text-lh-muted">
          <Link className="font-semibold text-lh-blue hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
