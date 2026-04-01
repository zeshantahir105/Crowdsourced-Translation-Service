import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "../api";
import { useAuth } from "../context/AuthContext";

export function AuthCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refreshMe } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
    if (err) {
      nav("/login?error=google", { replace: true });
      return;
    }
    if (token) {
      setToken(token);
      refreshMe().then(() => nav("/translator", { replace: true }));
    } else {
      nav("/login", { replace: true });
    }
  }, [params, nav, refreshMe]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-lh-muted">
      Completing sign-in…
    </div>
  );
}
