import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { LoadingButton } from "../components/LoadingButton";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const freeFeatures = [
  "Text translation with AI draft (character limits apply)",
  "Crowdsourced workflow: draft → edit → review → approve",
  "Glossary (personal)",
  "Document upload: .txt only, smaller files",
  "Developer API (limits follow your plan)",
];

const premiumFeatures = [
  "Higher text & extraction limits",
  "Documents: .txt, .docx, .pdf",
  "Larger file uploads",
  "Priority-style limits for teams (configurable via env)",
  "Same workflow, reputation, and API — scaled up",
];

export function Pricing() {
  const { user, isPremium, refreshMe } = useAuth();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  async function checkout() {
    if (!user) {
      window.location.href = "/login?from=/pricing";
      return;
    }
    setCheckoutBusy(true);
    try {
      const r = await api<{ url: string }>("/billing/create-checkout-session", { method: "POST", json: {} });
      if (r.url) window.location.href = r.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout unavailable — configure Stripe in backend/.env");
    } finally {
      setCheckoutBusy(false);
    }
  }

  async function openBillingPortal() {
    if (!user) return;
    setPortalBusy(true);
    try {
      const r = await api<{ url: string }>("/billing/create-portal-session", { method: "POST", json: {} });
      if (r.url) window.location.href = r.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalBusy(false);
    }
  }

  async function refreshPlan() {
    setRefreshBusy(true);
    try {
      await refreshMe();
    } finally {
      setRefreshBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-lh-surface px-4 py-10 md:px-8">
      <div className="mx-auto max-w-[1000px]">
        <h1 className="text-center text-3xl font-bold text-lh-ink">Plans</h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-lh-muted">
          Free for individuals; Premium for document formats, volume, and production workloads — aligned with your PRD
          subscription model.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-lh-border bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-lh-ink">Free</h2>
            <p className="mt-1 text-3xl font-bold text-lh-blue">$0</p>
            <ul className="mt-6 space-y-3">
              {freeFeatures.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-lh-ink">
                  <Check className="size-5 shrink-0 text-green-600" />
                  {f}
                </li>
              ))}
            </ul>
            {!user && (
              <Link
                to="/register"
                className="mt-8 block w-full rounded-lg border border-lh-border py-3 text-center text-sm font-semibold hover:bg-lh-surface"
              >
                Get started
              </Link>
            )}
          </div>

          <div className="rounded-2xl border-2 border-lh-blue bg-white p-8 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-lh-ink">Premium</h2>
              {user && isPremium ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-900">
                  Your plan
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  Recommended
                </span>
              )}
            </div>
            <p className="mt-1 text-3xl font-bold text-lh-blue">Stripe</p>
            <p className="text-xs text-lh-muted">Price ID from your Stripe product</p>
            {user && isPremium && (
              <p className="mt-2 text-sm text-lh-ink">
                You are subscribed to Premium.
                {user.subscriptionExpiresAt && (
                  <>
                    {" "}
                    Current period through{" "}
                    <span className="font-semibold">
                      {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                    </span>
                    .
                  </>
                )}
              </p>
            )}
            <ul className="mt-6 space-y-3">
              {premiumFeatures.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-lh-ink">
                  <Check className="size-5 shrink-0 text-green-600" />
                  {f}
                </li>
              ))}
            </ul>
            {!user && (
              <button
                type="button"
                onClick={() => (window.location.href = "/login?from=/pricing")}
                className="mt-8 w-full rounded-lg bg-lh-blue py-3 text-sm font-semibold text-white hover:bg-lh-blue-hover"
              >
                Log in to subscribe
              </button>
            )}
            {user && !isPremium && (
              <>
                <LoadingButton
                  type="button"
                  onClick={checkout}
                  loading={checkoutBusy}
                  loadingLabel="Redirecting to Stripe…"
                  className="mt-8 w-full rounded-lg bg-lh-blue py-3 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
                >
                  Subscribe with Stripe
                </LoadingButton>
                <LoadingButton
                  type="button"
                  onClick={refreshPlan}
                  loading={refreshBusy}
                  loadingLabel="Refreshing…"
                  className="mt-2 w-full rounded-lg py-2 text-center text-xs font-semibold text-lh-blue hover:bg-lh-surface hover:underline disabled:opacity-50"
                >
                  Refresh plan after checkout
                </LoadingButton>
              </>
            )}
            {user && isPremium && (
              <div className="mt-8 space-y-2">
                <LoadingButton
                  type="button"
                  onClick={openBillingPortal}
                  loading={portalBusy}
                  loadingLabel="Opening portal…"
                  className="w-full rounded-lg bg-lh-blue py-3 text-sm font-semibold text-white hover:bg-lh-blue-hover disabled:opacity-50"
                >
                  Manage subscription
                </LoadingButton>
                <p className="text-center text-xs text-lh-muted">
                  Update payment method, view invoices, or cancel your plan in Stripe&apos;s billing portal.
                </p>
                <LoadingButton
                  type="button"
                  onClick={refreshPlan}
                  loading={refreshBusy}
                  loadingLabel="Refreshing…"
                  className="w-full rounded-lg py-2 text-center text-xs font-semibold text-lh-blue hover:bg-lh-surface hover:underline disabled:opacity-50"
                >
                  Refresh plan status
                </LoadingButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
