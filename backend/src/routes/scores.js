import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { versionId, rating, comments } = req.body;
    if (!versionId || rating == null) {
      return res.status(400).json({ error: "versionId and rating required" });
    }
    if (!["REVIEWER", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Reviewer role required" });
    }
    const r = Number(rating);
    if (r < 1 || r > 5) return res.status(400).json({ error: "rating 1-5" });

    const version = await prisma.translationVersion.findUnique({
      where: { id: versionId },
      include: { request: true },
    });
    if (!version) return res.status(404).json({ error: "Version not found" });

    if (version.request.status !== "REVIEW") {
      return res.status(400).json({ error: "This request is not awaiting review" });
    }

    const existing = await prisma.qualityScore.findUnique({
      where: {
        versionId_reviewerId: { versionId, reviewerId: req.user.id },
      },
    });
    if (existing) {
      return res.status(409).json({ error: "You already submitted a score for this version" });
    }

    const score = await prisma.qualityScore.create({
      data: {
        versionId,
        reviewerId: req.user.id,
        rating: r,
        comments: comments || null,
      },
    });

    const agg = await prisma.qualityScore.aggregate({
      where: { versionId },
      _avg: { rating: true },
    });
    const avgRating = agg._avg.rating ?? r;

    await prisma.translationVersion.update({
      where: { id: versionId },
      data: { score: avgRating },
    });

    await prisma.translationRequest.update({
      where: { id: version.requestId },
      data: { status: "APPROVED" },
    });

    await prisma.task.updateMany({
      where: { requestId: version.requestId, role: "REVIEW" },
      data: { status: "DONE", assigneeId: req.user.id, completedAt: new Date() },
    });

    await prisma.reputation.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, points: 5, badges: ["reviewer"] },
      update: { points: { increment: 5 } },
    });

    await prisma.reputation.updateMany({
      where: { userId: version.translatorId },
      data: { points: { increment: 15 } },
    });

    req.app.get("io")?.emit("translation:update", {
      requestId: version.requestId,
      status: "APPROVED",
    });

    res.status(201).json({ score });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit score" });
  }
});

export default router;
