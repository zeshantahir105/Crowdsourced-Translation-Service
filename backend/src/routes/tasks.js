import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  if (!["TRANSLATOR", "REVIEWER", "ADMIN"].includes(req.user.role)) {
    return res.json({ tasks: [] });
  }

  const roleFilter =
    req.user.role === "ADMIN"
      ? {}
      : req.user.role === "TRANSLATOR"
        ? { role: "TRANSLATE" }
        : { role: "REVIEW" };

  const tasks = await prisma.task.findMany({
    where: {
      status: { in: ["OPEN", "ASSIGNED"] },
      ...roleFilter,
    },
    orderBy: { createdAt: "asc" },
    include: {
      request: {
        select: {
          id: true,
          sourceText: true,
          sourceLang: true,
          targetLang: true,
          domain: true,
          status: true,
          aiDraft: true,
          owner: { select: { name: true } },
        },
      },
      assignee: { select: { id: true, name: true } },
    },
    take: 100,
  });

  res.json({ tasks });
});

router.post("/:id/claim", requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Not found" });
  if (task.status === "DONE") return res.status(400).json({ error: "Task completed" });

  const okRole =
    (task.role === "TRANSLATE" && ["TRANSLATOR", "ADMIN"].includes(req.user.role)) ||
    (task.role === "REVIEW" && ["REVIEWER", "ADMIN"].includes(req.user.role));
  if (!okRole) return res.status(403).json({ error: "Wrong role for this task" });

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      assigneeId: req.user.id,
      status: "ASSIGNED",
      assignedAt: new Date(),
    },
    include: { request: true },
  });

  req.app.get("io")?.emit("task:claimed", { taskId: task.id });

  res.json({ task: updated });
});

export default router;
