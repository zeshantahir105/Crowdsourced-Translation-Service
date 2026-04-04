import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { fetchDraftTranslation } from "../services/aiClient.js";
import { enqueueAiDraft, isQueueEnabled } from "../queues/lingoHubQueue.js";
import { maxTextChars } from "../services/planService.js";
import {
  isTranslationServiceFailureText,
  translationServiceFailureWithSnippet,
} from "../constants/translationUserMessages.js";

const router = Router();

/** Use UI preview text when server-side draft is missing or a known failure placeholder. */
function mergeClientNeuralDraft(serverDraft, clientDraft, cap) {
  const c = typeof clientDraft === "string" ? clientDraft.trim().slice(0, cap) : "";
  const isBad = (s) =>
    s == null || typeof s !== "string" || isTranslationServiceFailureText(s);
  if (!isBad(c) && isBad(serverDraft)) return c;
  return serverDraft ?? null;
}

/** Instant neural draft (DeepL-style) without creating a workflow job */
router.post("/preview", requireAuth, async (req, res) => {
  try {
    const { sourceText, sourceLang, targetLang, domain } = req.body;
    if (!sourceText || !sourceLang || !targetLang) {
      return res.status(400).json({ error: "sourceText, sourceLang, targetLang required" });
    }
    const cap = maxTextChars(req.user);
    if (sourceText.length > cap) {
      return res.status(403).json({
        error: `Text exceeds your plan limit (${cap} characters). Upgrade to Premium for higher limits.`,
        limit: cap,
        planTier: req.user.planTier,
      });
    }
    let translated = "";
    try {
      translated = await fetchDraftTranslation({
        text: sourceText,
        sourceLang,
        targetLang,
        domain: domain || "general",
      });
    } catch (e) {
      console.warn(e);
      translated = translationServiceFailureWithSnippet(sourceText, 800);
    }
    res.json({ translated_text: translated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Preview failed" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { sourceText, sourceLang, targetLang, domain, clientDraft } = req.body;
    if (!sourceText || !sourceLang || !targetLang) {
      return res.status(400).json({ error: "sourceText, sourceLang, targetLang required" });
    }
    const cap = maxTextChars(req.user);
    if (sourceText.length > cap) {
      return res.status(403).json({
        error: `Text exceeds your plan limit (${cap} characters). Upgrade to Premium for higher limits.`,
        limit: cap,
        planTier: req.user.planTier,
      });
    }

    let aiDraft = null;
    try {
      aiDraft = await fetchDraftTranslation({
        text: sourceText,
        sourceLang,
        targetLang,
        domain: domain || "general",
      });
    } catch (e) {
      console.warn("AI draft failed, saving without draft:", e.message);
      aiDraft = translationServiceFailureWithSnippet(sourceText, 200);
    }

    aiDraft = mergeClientNeuralDraft(aiDraft, clientDraft, cap);

    const request = await prisma.translationRequest.create({
      data: {
        ownerId: req.user.id,
        inputKind: "TEXT",
        sourceText,
        sourceLang,
        targetLang,
        domain: domain || "general",
        status: "IN_PROGRESS",
        aiDraft,
      },
    });

    await prisma.task.create({
      data: {
        requestId: request.id,
        role: "TRANSLATE",
        status: "OPEN",
      },
    });

    // Retry in background only when inline draft failed (same as documents). No worker required for a good draft.
    if (isQueueEnabled() && isTranslationServiceFailureText(aiDraft)) {
      try {
        await enqueueAiDraft(request.id);
      } catch (e) {
        console.error("[lingohub] enqueueAiDraft failed:", e.message);
      }
    }

    req.app.get("io")?.emit("translation:update", { requestId: request.id, status: request.status });

    res.status(201).json({ request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create request" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  const list = await prisma.translationRequest.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 3 },
      tasks: true,
    },
  });
  res.json({ requests: list });
});

router.get("/:id", requireAuth, async (req, res) => {
  const request = await prisma.translationRequest.findUnique({
    where: { id: req.params.id },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        include: { translator: { select: { id: true, name: true } } },
      },
      tasks: { include: { assignee: { select: { id: true, name: true } } } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) return res.status(404).json({ error: "Not found" });
  const isOwner = request.ownerId === req.user.id;
  const isStaff = ["TRANSLATOR", "REVIEWER", "ADMIN"].includes(req.user.role);
  if (!isOwner && !isStaff) return res.status(403).json({ error: "Forbidden" });

  res.json({ request });
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ["DRAFT", "IN_PROGRESS", "REVIEW", "APPROVED"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const existing = await prisma.translationRequest.findUnique({
    where: { id: req.params.id },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (existing.ownerId !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const request = await prisma.translationRequest.update({
    where: { id: req.params.id },
    data: { status },
  });
  req.app.get("io")?.emit("translation:update", { requestId: request.id, status });
  res.json({ request });
});

export default router;
