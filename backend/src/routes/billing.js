import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db.js";
import { resolveStripeCustomerId } from "../services/stripeCustomer.js";

const router = Router();

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
    const subRef = session.subscription;
    let periodEnd = null;
    if (subRef && typeof subRef === "object" && subRef.current_period_end) {
      periodEnd = subRef.current_period_end;
    } else if (typeof subRef === "string") {
      const sub = await stripe.subscriptions.retrieve(subRef);
      if (sub.current_period_end) periodEnd = sub.current_period_end;
    }
    if (periodEnd) {
      subscriptionExpiresAt = new Date(periodEnd * 1000);
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
