import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth, type SignupRole } from "../context/AuthContext";

const ROLES: { id: SignupRole; title: string; desc: string }[] = [
  {
    id: "CONSUMER",
    title: "Request translations",
    desc: "Submit text & documents for AI + community workflow.",
  },
  {
    id: "TRANSLATOR",
    title: "Translator",
    desc: "Claim jobs, edit drafts, submit versions.",
  },
  {
    id: "REVIEWER",
    title: "Reviewer",
    desc: "Score quality and approve final output.",
  },
];

export function Register() {
  const { signup, user, verifyEmail, resendVerification } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("CONSUMER");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [sentHint, setSentHint] = useState(false);
  const [resending, setResending] = useState(false);

  if (user?.emailVerified) {
    return <Navigate to="/translator" replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const r = await signup(email, password, name, role);
      if (r.needsVerification) {
        setStep("verify");
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Signup failed");
    }
  }

  async function onVerify(e: React.FormEvent) {
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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <div className="rounded-2xl border border-lh-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-lh-blue">Create account</h1>
        <p className="mt-1 text-sm text-lh-muted">Choose how you will use LingoHub AI</p>

        {step === "verify" ? (
          <form onSubmit={onVerify} className="mt-8 space-y-4">
            <p className="text-sm text-lh-ink">
              We sent a code to <span className="font-semibold">{email}</span>.
            </p>
            <div>
              <label className="text-xs font-semibold text-lh-muted">6-digit code</label>
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
            {sentHint && (
              <p className="text-sm text-green-700">A new code was sent to your inbox.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-lh-blue py-2.5 text-sm font-semibold text-white hover:bg-lh-blue-hover"
            >
              Verify and continue
            </button>
            <button
              type="button"
              disabled={resending}
              onClick={onResend}
              className="w-full rounded-lg border border-lh-border py-2.5 text-sm font-semibold text-lh-ink hover:bg-lh-surface disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setErr("");
                setCode("");
              }}
              className="w-full text-center text-xs text-lh-blue hover:underline"
            >
              Edit sign-up details
            </button>
          </form>
        ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <div>
            <span className="text-xs font-semibold text-lh-muted">Account type</span>
            <div className="mt-2 grid gap-2">
              {ROLES.map((r) => (
                <label
                  key={r.id}
                  className={[
                    "flex cursor-pointer flex-col rounded-xl border px-4 py-3 text-start transition-colors",
                    role === r.id
                      ? "border-lh-blue bg-lh-blue/5 ring-1 ring-lh-blue"
                      : "border-lh-border hover:bg-lh-surface",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      checked={role === r.id}
                      onChange={() => setRole(r.id)}
                      className="text-lh-blue"
                    />
                    <span className="font-semibold text-lh-ink">{r.title}</span>
                  </div>
                  <p className="ms-7 text-xs text-lh-muted">{r.desc}</p>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-lh-muted">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-lh-border px-3 py-2 text-sm outline-none ring-lh-blue focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-lh-blue py-2.5 text-sm font-semibold text-white hover:bg-lh-blue-hover"
          >
            Sign up
          </button>
        </form>
        )}

        <p className="mt-6 text-center text-sm text-lh-muted">
          Already have an account?{" "}
          <Link className="font-semibold text-lh-blue hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
