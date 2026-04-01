import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";

const router = Router();

/** @param {import("stripe").default} stripe */
async function resolveStripeCustomerId(stripe, userId, email) {
  for (const status of ["active", "trialing"]) {
    const found = await stripe.subscriptions.search({
      query: `metadata['userId']:'${userId}' AND status:'${status}'`,
      limit: 1,
    });
    const sub = found.data[0];
    if (sub) {
      return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    }
  }

  const customers = await stripe.customers.list({ email, limit: 20 });
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: c.id,
      limit: 10,
    });
    const open = subs.data.find((s) => s.status === "active" || s.status === "trialing");
    if (open) return c.id;
  }

  return null;
}

/**
 * Stripe Checkout — returns session URL when STRIPE_SECRET_KEY + STRIPE_PRICE_PREMIUM are set.
 */
router.post("/create-checkout-session", requireAuth, async (req, res) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_PREMIUM;
  const front = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!secret || !priceId) {
    return res.status(503).json({
      error: "Billing not configured",
      hint: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_PREMIUM in backend/.env",
    });
  }

  if (req.user.planTier === "PREMIUM") {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);
    const existingCustomer = await resolveStripeCustomerId(stripe, req.user.id, req.user.email);
    if (existingCustomer) {
      return res.status(400).json({
        error: "You already have an active Premium subscription",
        hint: "Use Manage subscription on the pricing page to cancel or update billing.",
      });
    }
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: req.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${front}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${front}/pricing`,
      client_reference_id: req.user.id,
      metadata: { userId: req.user.id },
      subscription_data: {
        metadata: { userId: req.user.id },
      },
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Stripe error" });
  }
});

/**
 * After Checkout redirect, confirm the session with Stripe and upgrade the user.
 * Use this when webhooks are not reachable (e.g. localhost without Stripe CLI).
 */
router.post("/sync-checkout-session", requireAuth, async (req, res) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const sessionId = req.body?.sessionId;
  if (!secret) {
    return res.status(503).json({ error: "Billing not configured" });
  }
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId required" });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const userId = session.metadata?.userId || session.client_reference_id;
    if (!userId || userId !== req.user.id) {
      return res.status(403).json({ error: "Session does not belong to this account" });
    }

    const paid =
      session.status === "complete" &&
      (session.payment_status === "paid" || session.payment_status === "no_payment_required");

    if (!paid) {
      return res.status(400).json({ error: "Checkout session is not completed or paid" });
    }

    let subscriptionExpiresAt = null;
    const sub = session.subscription;
    if (sub && typeof sub === "object" && sub.current_period_end) {
      subscriptionExpiresAt = new Date(sub.current_period_end * 1000);
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        planTier: "PREMIUM",
        subscriptionExpiresAt,
      },
    });

    res.json({ ok: true, planTier: "PREMIUM", subscriptionExpiresAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Stripe error" });
  }
});

/**
 * Stripe Customer Portal — cancel subscription, update payment method, invoices.
 * Enable in Dashboard: Settings → Billing → Customer portal.
 */
router.post("/create-portal-session", requireAuth, async (req, res) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  const front = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!secret) {
    return res.status(503).json({ error: "Billing not configured" });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secret);

    const customerId = await resolveStripeCustomerId(stripe, req.user.id, req.user.email);
    if (!customerId) {
      return res.status(404).json({
        error: "No billing profile found in Stripe for this account",
        hint:
          "If Premium was granted manually, there is nothing to manage in Stripe. Otherwise try refreshing your plan after checkout.",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${front}/pricing`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Stripe error" });
  }
});

export default router;
