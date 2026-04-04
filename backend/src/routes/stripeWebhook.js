import express from "express";
import { prisma } from "../db.js";

const router = express.Router();

/**
 * Raw body required for signature verification — mounted before express.json in index.js
 */
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !whSecret) {
      return res.status(503).send("Stripe webhook not configured");
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).send("Missing stripe-signature");

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(secret);
      const event = stripe.webhooks.constructEvent(req.body, sig, whSecret);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.userId || session.client_reference_id;
        if (userId) {
          let subscriptionExpiresAt = null;
          const rawSub = session.subscription;
          const subId = typeof rawSub === "string" ? rawSub : rawSub?.id;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            if (sub.current_period_end) {
              subscriptionExpiresAt = new Date(sub.current_period_end * 1000);
            }
          }
          await prisma.user.update({
            where: { id: userId },
            data: {
              planTier: "PREMIUM",
              subscriptionExpiresAt,
            },
          });
        }
      }

      if (event.type === "customer.subscription.updated") {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId && (sub.status === "active" || sub.status === "trialing")) {
          let subscriptionExpiresAt = null;
          if (sub.current_period_end) {
            subscriptionExpiresAt = new Date(sub.current_period_end * 1000);
          }
          await prisma.user.update({
            where: { id: userId },
            data: { planTier: "PREMIUM", subscriptionExpiresAt },
          });
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { planTier: "FREE", subscriptionExpiresAt: null },
          });
        }
      }

      res.json({ received: true });
    } catch (e) {
      console.error("Stripe webhook error:", e.message);
      res.status(400).send(`Webhook Error: ${e.message}`);
    }
  }
);

export default router;
