import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { setToken } from "../api";
import { useAuth } from "../context/AuthContext";

export function AuthCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refreshMe } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = params.get("token");
      const err = params.get("error");
      if (err) {
        nav("/login?error=google", { replace: true });
        return;
      }
      if (token) {
        setToken(token);
        const ok = await refreshMe();
        if (cancelled) return;
        if (ok) nav("/translator", { replace: true });
        else nav("/login?error=session", { replace: true });
        return;
      }
      nav("/login", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [params, nav, refreshMe]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-lh-muted">
      <Loader2 className="size-8 animate-spin text-lh-blue" aria-hidden />
      <p className="text-sm font-medium">Completing sign-in…</p>
    </div>
  );
}
