import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { LoadingButton } from "../components/LoadingButton";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = searchParams.get("email")?.trim();
    if (q) setEmail(q);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (newPassword !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await api<{ ok?: boolean }>("/auth/reset-password", {
        method: "POST",
        json: {
          email: email.trim(),
          code: code.replace(/\s/g, ""),
          newPassword,
        },
      });
      nav("/login?reset=success", { replace: true });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-lh-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-lh-blue">Set a new password</h1>
        <p className="mt-1 text-sm text-lh-muted">Use the 6-digit code from your email. It expires in 15 minutes.</p>

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
            <label className="text-xs font-semibold text-lh-muted">Reset code</label>
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
          <div>
            <label className="text-xs font-semibold text-lh-muted">New password</label>
            <input
              className="mt-1 w-full rounded-lg border border-lh-border px-3 py-2 text-sm outline-none ring-lh-blue focus:ring-2"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-lh-muted">Confirm password</label>
            <input
              className="mt-1 w-full rounded-lg border border-lh-border px-3 py-2 text-sm outline-none ring-lh-blue focus:ring-2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <LoadingButton
            type="submit"
            loading={submitting}
            loadingLabel="Updating…"
            className="w-full rounded-lg bg-lh-blue py-2.5 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
          >
            Update password
          </LoadingButton>
        </form>

        <p className="mt-6 text-center text-sm text-lh-muted">
          <Link className="font-semibold text-lh-blue hover:underline" to="/forgot-password">
            Request a new code
          </Link>
          {" · "}
          <Link className="font-semibold text-lh-blue hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
