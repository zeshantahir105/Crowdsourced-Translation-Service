import { Router } from "express";
import express from "express";
import crypto from "crypto";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { generateApiKey } from "../services/apiKey.js";
import { fetchDraftTranslation } from "../services/aiClient.js";
import { maxTextChars } from "../services/planService.js";

const router = Router();

router.post("/keys", requireAuth, async (req, res) => {
  const { name } = req.body;
  const { raw, prefix, hash } = generateApiKey();
  await prisma.apiKey.create({
    data: {
      userId: req.user.id,
      name: name || "Default",
      keyHash: hash,
      keyPrefix: prefix,
    },
  });
  res.status(201).json({
    apiKey: raw,
    prefix,
    warning: "Store this key securely; it will not be shown again.",
  });
});

router.get("/keys", requireAuth, async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { userId: req.user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ keys });
});

router.delete("/keys/:id", requireAuth, async (req, res) => {
  const row = await prisma.apiKey.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!row) return res.status(404).json({ error: "Not found" });
  await prisma.apiKey.delete({ where: { id: row.id } });
  res.json({ ok: true });
});

/** Usage stats — simple counts */
router.get("/usage", requireAuth, async (req, res) => {
  const keyCount = await prisma.apiKey.count({ where: { userId: req.user.id } });
  const requestCount = await prisma.translationRequest.count({
    where: { ownerId: req.user.id },
  });
  res.json({ apiKeys: keyCount, translationRequests: requestCount });
});

export default router;

/** Public developer translate — mounted at /api in index */
export function createPublicTranslateRouter() {
  const r = Router();
  r.use(express.json({ limit: "512kb" }));

  r.post("/translate", async (req, res) => {
    const key = req.headers["x-api-key"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
    if (!key || typeof key !== "string") {
      return res.status(401).json({ error: "Missing X-Api-Key" });
    }

    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const apiRow = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!apiRow) return res.status(401).json({ error: "Invalid API key" });

    await prisma.apiKey.update({
      where: { id: apiRow.id },
      data: { lastUsedAt: new Date() },
    });

    const owner = await prisma.user.findUnique({
      where: { id: apiRow.userId },
      select: { planTier: true, subscriptionExpiresAt: true },
    });
    const { text, source_lang, target_lang, domain } = req.body;
    if (!text || !source_lang || !target_lang) {
      return res.status(400).json({ error: "text, source_lang, target_lang required" });
    }

    const cap = maxTextChars(owner || { planTier: "FREE" });
    if (text.length > cap) {
      return res.status(403).json({
        error: `Text exceeds API key owner plan limit (${cap} characters)`,
        limit: cap,
      });
    }

    let translated = "";
    try {
      translated = await fetchDraftTranslation({
        text,
        sourceLang: source_lang,
        targetLang: target_lang,
        domain: domain || "general",
      });
    } catch (e) {
      console.warn(e);
      translated = `[fallback] ${text}`;
    }

    res.json({
      translated_text: translated,
      meta: { model: "lingohub-ai", source_lang, target_lang },
    });
  });

  return r;
}
