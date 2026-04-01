import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.query.userId || req.user.id;
  if (userId !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const rep = await prisma.reputation.findUnique({
    where: { userId: String(userId) },
    include: { user: { select: { name: true, email: true, role: true } } },
  });
  res.json({ reputation: rep });
});

export default router;
