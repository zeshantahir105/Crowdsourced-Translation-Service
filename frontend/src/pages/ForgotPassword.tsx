import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { LoadingButton } from "../components/LoadingButton";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      await api<{ ok?: boolean; message?: string }>("/auth/forgot-password", {
        method: "POST",
        json: { email: email.trim() },
      });
      setDone(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-lh-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-lh-blue">Forgot password</h1>
        <p className="mt-1 text-sm text-lh-muted">
          Enter the email for your password account. We&apos;ll send a 6-digit code if it exists (Google-only
          accounts have no password to reset).
        </p>

        {done ? (
          <div className="mt-8 space-y-4">
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              If an account with a password exists for that address, check your inbox for a reset code. Codes expire
              in 15 minutes.
            </p>
            <Link
              to={`/reset-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
              className="block w-full rounded-lg bg-lh-blue py-2.5 text-center text-sm font-semibold text-white hover:bg-lh-blue-hover"
            >
              Enter reset code
            </Link>
            <Link className="block text-center text-sm font-semibold text-lh-blue hover:underline" to="/login">
              Back to sign in
            </Link>
          </div>
        ) : (
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
            {err && <p className="text-sm text-red-600">{err}</p>}
            <LoadingButton
              type="submit"
              loading={submitting}
              loadingLabel="Sending…"
              className="w-full rounded-lg bg-lh-blue py-2.5 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
            >
              Send reset code
            </LoadingButton>
            <Link className="block text-center text-sm font-semibold text-lh-blue hover:underline" to="/login">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
