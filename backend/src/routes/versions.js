import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { requestId, text } = req.body;
    if (!requestId || text == null) {
      return res.status(400).json({ error: "requestId and text required" });
    }
    if (!["TRANSLATOR", "REVIEWER", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Translator role required" });
    }

    const request = await prisma.translationRequest.findUnique({
      where: { id: requestId },
      include: { tasks: true },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });

    const version = await prisma.translationVersion.create({
      data: {
        requestId,
        translatorId: req.user.id,
        text,
      },
    });

    const translateTask = request.tasks.find((t) => t.role === "TRANSLATE" && t.status !== "DONE");
    if (translateTask) {
      await prisma.task.update({
        where: { id: translateTask.id },
        data: {
          status: "DONE",
          assigneeId: req.user.id,
          completedAt: new Date(),
        },
      });
    }

    await prisma.translationRequest.update({
      where: { id: requestId },
      data: { status: "REVIEW" },
    });

    let reviewTask = request.tasks.find((t) => t.role === "REVIEW");
    if (!reviewTask) {
      reviewTask = await prisma.task.create({
        data: { requestId, role: "REVIEW", status: "OPEN" },
      });
    } else if (reviewTask.status === "DONE") {
      await prisma.task.update({
        where: { id: reviewTask.id },
        data: { status: "OPEN", assigneeId: null, completedAt: null },
      });
    }

    const points = 10;
    await prisma.reputation.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, points, badges: ["contributor"] },
      update: { points: { increment: points } },
    });

    req.app.get("io")?.emit("translation:update", { requestId, status: "REVIEW" });

    res.status(201).json({ version });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save version" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  const { requestId } = req.query;
  if (!requestId) return res.status(400).json({ error: "requestId query required" });

  const request = await prisma.translationRequest.findUnique({
    where: { id: String(requestId) },
  });
  if (!request) return res.status(404).json({ error: "Not found" });
  const isOwner = request.ownerId === req.user.id;
  const isStaff = ["TRANSLATOR", "REVIEWER", "ADMIN"].includes(req.user.role);
  if (!isOwner && !isStaff) return res.status(403).json({ error: "Forbidden" });

  const versions = await prisma.translationVersion.findMany({
    where: { requestId: String(requestId) },
    orderBy: { createdAt: "desc" },
    include: { translator: { select: { id: true, name: true } } },
  });
  res.json({ versions });
});

export default router;
