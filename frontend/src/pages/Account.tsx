import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export function Account() {
  const { user, reputation, isPremium, logout, refreshMe } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const syncedRef = useRef(false);
  const [checkoutSyncing, setCheckoutSyncing] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    const sessionId = searchParams.get("session_id");
    if (!sessionId || syncedRef.current) return;
    syncedRef.current = true;

    (async () => {
      setCheckoutSyncing(true);
      try {
        await api("/billing/sync-checkout-session", {
          method: "POST",
          json: { sessionId },
        });
        await refreshMe();
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete("checkout");
            next.delete("session_id");
            return next;
          },
          { replace: true }
        );
      } catch {
        syncedRef.current = false;
      } finally {
        setCheckoutSyncing(false);
      }
    })();
  }, [searchParams, setSearchParams, refreshMe]);

  if (!user) return null;

  return (
    <div className="min-h-full bg-lh-surface px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[640px] space-y-6">
        <h1 className="text-2xl font-bold text-lh-ink">Account</h1>

        {checkoutSyncing && (
          <p className="flex items-center gap-2 rounded-lg border border-lh-border bg-white px-4 py-3 text-sm text-lh-muted shadow-sm">
            <Loader2 className="size-4 shrink-0 animate-spin text-lh-blue" aria-hidden />
            Updating your plan from checkout…
          </p>
        )}

        <div className="rounded-xl border border-lh-border bg-white p-6 shadow-sm space-y-3 text-sm">
          <div>
            <span className="text-lh-muted">Name</span>
            <p className="font-semibold text-lh-ink">{user.name}</p>
          </div>
          <div>
            <span className="text-lh-muted">Email</span>
            <p className="font-semibold text-lh-ink">{user.email}</p>
          </div>
          <div>
            <span className="text-lh-muted">Role</span>
            <p className="font-semibold capitalize text-lh-ink">{user.role.toLowerCase().replace("_", " ")}</p>
            <p className="mt-1 text-xs text-lh-muted">
              Set at sign-up (email or Google). Admins can change roles in the admin console.
            </p>
          </div>
          <div>
            <span className="text-lh-muted">Plan</span>
            <p className="font-semibold text-lh-ink">{isPremium ? "Premium" : "Free"}</p>
            {user.subscriptionExpiresAt && (
              <p className="text-xs text-lh-muted">
                Active until {new Date(user.subscriptionExpiresAt).toLocaleString()}
              </p>
            )}
          </div>
          {reputation && (
            <div>
              <span className="text-lh-muted">Reputation</span>
              <p className="font-semibold text-lh-ink">{reputation.points} points</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="rounded-lg bg-lh-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lh-blue-hover"
          >
            {isPremium ? "Manage plan" : "Upgrade"}
          </Link>
          {user.role === "ADMIN" && (
            <Link
              to="/admin"
              className="rounded-lg border border-lh-border px-4 py-2 text-sm font-semibold hover:bg-lh-surface"
            >
              Admin console
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
