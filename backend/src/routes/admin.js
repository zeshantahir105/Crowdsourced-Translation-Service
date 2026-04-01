import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

const ROLES = ["CONSUMER", "TRANSLATOR", "REVIEWER", "ADMIN"];
const PLANS = ["FREE", "PREMIUM"];

router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      planTier: true,
      subscriptionExpiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json({ users });
});

router.patch("/users/:id", async (req, res) => {
  const { role, planTier, subscriptionExpiresAt } = req.body;
  const data = {};

  if (role !== undefined) {
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    data.role = role;
  }
  if (planTier !== undefined) {
    if (!PLANS.includes(planTier)) {
      return res.status(400).json({ error: "Invalid planTier" });
    }
    data.planTier = planTier;
  }
  if (subscriptionExpiresAt !== undefined) {
    data.subscriptionExpiresAt =
      subscriptionExpiresAt === null || subscriptionExpiresAt === ""
        ? null
        : new Date(subscriptionExpiresAt);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planTier: true,
        subscriptionExpiresAt: true,
      },
    });
    res.json({ user });
  } catch {
    res.status(404).json({ error: "User not found" });
  }
});

export default router;
