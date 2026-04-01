import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "../api";

export type Role = "CONSUMER" | "TRANSLATOR" | "REVIEWER" | "ADMIN";
export type SignupRole = "CONSUMER" | "TRANSLATOR" | "REVIEWER";
export type PlanTier = "FREE" | "PREMIUM";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  planTier: PlanTier;
  subscriptionExpiresAt: string | null;
  emailVerified: boolean;
};

type Rep = { points: number; badges: string[] } | null;

export type SignupResult = { needsVerification: true; email: string };

export type LoginResult = { needsLoginOtp: true; email: string };

type AuthState = {
  user: User | null;
  reputation: Rep;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult | void>;
  signup: (email: string, password: string, name: string, role: SignupRole) => Promise<SignupResult>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  verifyLoginOtp: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  resendLoginOtp: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  isPremium: boolean;
};

const Ctx = createContext<AuthState | null>(null);

function premiumActive(u: User | null): boolean {
  if (!u || u.planTier !== "PREMIUM") return false;
  if (u.subscriptionExpiresAt) {
    return new Date(u.subscriptionExpiresAt) > new Date();
  }
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [reputation, setReputation] = useState<Rep>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setReputation(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api<{ user: User; reputation: { points: number; badges: string[] } | null }>(
        "/auth/me"
      );
      setUser({
        ...r.user,
        emailVerified: r.user.emailVerified ?? true,
      });
      setReputation(r.reputation ? { points: r.reputation.points, badges: r.reputation.badges } : null);
    } catch {
      setToken(null);
      setUser(null);
      setReputation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{
      needsLoginOtp?: boolean;
      email?: string;
      token?: string;
      user?: User;
    }>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    if (r.needsLoginOtp && r.email) {
      return { needsLoginOtp: true as const, email: r.email };
    }
    if (r.token && r.user) {
      setToken(r.token);
      await refreshMe();
      return;
    }
    throw new Error("Unexpected login response");
  }, [refreshMe]);

  const signup = useCallback(
    async (email: string, password: string, name: string, role: SignupRole) => {
      const r = await api<{ needsVerification?: boolean; email?: string }>("/auth/signup", {
        method: "POST",
        json: { email, password, name, role },
      });
      if (r.needsVerification && r.email) {
        return { needsVerification: true as const, email: r.email };
      }
      throw new Error("Unexpected signup response");
    },
    []
  );

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      const r = await api<{ token: string; user: User }>("/auth/verify-email", {
        method: "POST",
        json: { email, code },
      });
      setToken(r.token);
      await refreshMe();
    },
    [refreshMe]
  );

  const verifyLoginOtp = useCallback(
    async (email: string, code: string) => {
      const r = await api<{ token: string; user: User }>("/auth/verify-login-otp", {
        method: "POST",
        json: { email, code },
      });
      setToken(r.token);
      await refreshMe();
    },
    [refreshMe]
  );

  const resendVerification = useCallback(async (email: string) => {
    await api<{ ok: boolean }>("/auth/resend-verification", {
      method: "POST",
      json: { email },
    });
  }, []);

  const resendLoginOtp = useCallback(async (email: string, password: string) => {
    await api<{ ok: boolean }>("/auth/resend-login-otp", {
      method: "POST",
      json: { email, password },
    });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setReputation(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      reputation,
      loading,
      login,
      signup,
      verifyEmail,
      verifyLoginOtp,
      resendVerification,
      resendLoginOtp,
      logout,
      refreshMe,
      isPremium: premiumActive(user),
    }),
    [
      user,
      reputation,
      loading,
      login,
      signup,
      verifyEmail,
      verifyLoginOtp,
      resendVerification,
      resendLoginOtp,
      logout,
      refreshMe,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
