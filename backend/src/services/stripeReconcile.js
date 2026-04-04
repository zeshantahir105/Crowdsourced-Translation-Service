import { prisma } from "../db.js";
import { resolveStripeCustomerId } from "./stripeCustomer.js";

/** Avoid Stripe calls on every /auth/me for long-lived free accounts */
const reconcileCooldown = new Map();
const COOLDOWN_MS = 120_000;

/**
 * Align DB plan with Stripe when webhooks or redirect sync did not run (common on localhost).
 * Safe to call on login and GET /auth/me; failures are logged and ignored.
 */
export async function reconcileStripePremiumForUser(userId, email) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return;

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, subscriptionExpiresAt: true },
    });
    if (!row) return;

    const now = Date.now();
    const premiumOk =
      row.planTier === "PREMIUM" &&
      (!row.subscriptionExpiresAt || new Date(row.subscriptionExpiresAt) > new Date());

    if (premiumOk) return;

    const last = reconcileCooldown.get(userId);
    if (last && now - last < COOLDOWN_MS && row.planTier === "FREE") {
      return;
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);

    let activeSub = null;
    for (const status of ["active", "trialing"]) {
      const found = await stripe.subscriptions.search({
        query: `metadata['userId']:'${userId}' AND status:'${status}'`,
        limit: 1,
      });
      if (found.data[0]) {
        activeSub = found.data[0];
        break;
      }
    }

    if (!activeSub) {
      const customerId = await resolveStripeCustomerId(stripe, userId, email);
      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId, limit: 20 });
        activeSub =
          subs.data.find((s) => s.status === "active" || s.status === "trialing") || null;
      }
    }

    if (activeSub) {
      const subscriptionExpiresAt = activeSub.current_period_end
        ? new Date(activeSub.current_period_end * 1000)
        : null;
      await prisma.user.update({
        where: { id: userId },
        data: { planTier: "PREMIUM", subscriptionExpiresAt },
      });
      reconcileCooldown.delete(userId);
      return;
    }

    reconcileCooldown.set(userId, now);

    if (row.planTier === "PREMIUM") {
      await prisma.user.update({
        where: { id: userId },
        data: { planTier: "FREE", subscriptionExpiresAt: null },
      });
    }
  } catch (e) {
    console.error("reconcileStripePremiumForUser:", e.message || e);
  }
}
