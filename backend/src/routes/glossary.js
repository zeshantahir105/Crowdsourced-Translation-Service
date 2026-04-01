import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const { sourceTerm, translatedTerm, context } = req.body;
  if (!sourceTerm || !translatedTerm) {
    return res.status(400).json({ error: "sourceTerm and translatedTerm required" });
  }
  const entry = await prisma.glossary.create({
    data: {
      ownerId: req.user.id,
      sourceTerm,
      translatedTerm,
      context: context || null,
    },
  });
  res.status(201).json({ entry });
});

/**
 * Glossary “hints” for the translator UI: entries whose source term appears in the given text.
 * Full translation memory (past segment matches) is not implemented — see IMPLEMENTATION.md.
 */
router.get("/hints", requireAuth, async (req, res) => {
  const text = req.query.text != null ? String(req.query.text) : "";
  const trimmed = text.slice(0, 100_000);
  if (!trimmed.trim()) {
    return res.json({ hints: [] });
  }
  const lower = trimmed.toLowerCase();
  const entries = await prisma.glossary.findMany({
    where: { ownerId: req.user.id },
    orderBy: { updatedAt: "desc" },
    take: 400,
    select: {
      id: true,
      sourceTerm: true,
      translatedTerm: true,
      context: true,
    },
  });
  const hints = entries
    .filter((e) => e.sourceTerm && lower.includes(String(e.sourceTerm).toLowerCase()))
    .slice(0, 30);
  res.json({ hints });
});

/** Same as /hints but uses the *request owner’s* glossary (for translator/reviewer on a job). */
router.get("/hints-for-request/:requestId", requireAuth, async (req, res) => {
  const request = await prisma.translationRequest.findUnique({
    where: { id: req.params.requestId },
    select: { id: true, ownerId: true, sourceText: true },
  });
  if (!request) return res.status(404).json({ error: "Not found" });
  const staff = ["TRANSLATOR", "REVIEWER", "ADMIN"].includes(req.user.role);
  if (request.ownerId !== req.user.id && !staff) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const trimmed = request.sourceText.slice(0, 100_000);
  if (!trimmed.trim()) {
    return res.json({ hints: [] });
  }
  const lower = trimmed.toLowerCase();
  const entries = await prisma.glossary.findMany({
    where: { ownerId: request.ownerId },
    orderBy: { updatedAt: "desc" },
    take: 400,
    select: {
      id: true,
      sourceTerm: true,
      translatedTerm: true,
      context: true,
    },
  });
  const hints = entries
    .filter((e) => e.sourceTerm && lower.includes(String(e.sourceTerm).toLowerCase()))
    .slice(0, 30);
  res.json({ hints });
});

router.get("/", requireAuth, async (req, res) => {
  const q = req.query.q ? String(req.query.q) : "";
  const entries = await prisma.glossary.findMany({
    where: {
      ownerId: req.user.id,
      ...(q
        ? {
            OR: [
              { sourceTerm: { contains: q, mode: "insensitive" } },
              { translatedTerm: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  res.json({ entries });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const entry = await prisma.glossary.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
  });
  if (!entry) return res.status(404).json({ error: "Not found" });
  await prisma.glossary.delete({ where: { id: entry.id } });
  res.json({ ok: true });
});

export default router;
