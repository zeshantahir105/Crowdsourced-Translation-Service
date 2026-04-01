import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { fetchDraftTranslation } from "../services/aiClient.js";
import { enqueueAiDraft, isQueueEnabled } from "../queues/lingoHubQueue.js";
import { extractTextFromFile } from "../services/extractDocument.js";
import {
  allowedDocMimes,
  freeDocMaxBytes,
  isPremiumUser,
  maxTextChars,
  premiumDocMaxBytes,
} from "../services/planService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.join(__dirname, "../../uploads/documents");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const router = Router();

function uploadMiddleware(req, res, next) {
  const maxB = isPremiumUser(req.user) ? premiumDocMaxBytes() : freeDocMaxBytes();
  const allowed = allowedDocMimes(req.user);
  const upload = multer({
    storage,
    limits: { fileSize: maxB },
    fileFilter: (r, file, cb) => {
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error("File type not allowed for your plan"));
    },
  }).single("file");

  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" });
    }
    next();
  });
}

router.post("/", requireAuth, uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file required (multipart field name: file)" });
    }
    const { sourceLang, targetLang, domain } = req.body;
    if (!sourceLang || !targetLang) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
      return res.status(400).json({ error: "sourceLang and targetLang required" });
    }

    let sourceText;
    try {
      sourceText = await extractTextFromFile(req.file.path, req.file.mimetype);
    } catch (e) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
      return res.status(400).json({ error: `Could not read document: ${e.message}` });
    }

    const trimmed = sourceText.trim();
    const limit = maxTextChars(req.user);
    if (!trimmed) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
      return res.status(400).json({ error: "No extractable text in file" });
    }
    if (trimmed.length > limit) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
      return res.status(400).json({
        error: `Extracted text exceeds your plan limit (${limit} characters). Upgrade to Premium for higher limits.`,
      });
    }

    let aiDraft = null;
    if (!isQueueEnabled()) {
      try {
        aiDraft = await fetchDraftTranslation({
          text: trimmed,
          sourceLang,
          targetLang,
          domain: domain || "general",
        });
      } catch (e) {
        console.warn("AI draft failed:", e.message);
        aiDraft = `[AI unavailable] ${trimmed.slice(0, 200)}…`;
      }
    }

    const request = await prisma.translationRequest.create({
      data: {
        ownerId: req.user.id,
        inputKind: "DOCUMENT",
        sourceText: trimmed,
        sourceLang,
        targetLang,
        domain: domain || "general",
        status: "IN_PROGRESS",
        aiDraft,
        attachmentOriginalName: req.file.originalname,
        attachmentMime: req.file.mimetype,
        attachmentPath: req.file.path,
        extractedCharCount: trimmed.length,
      },
    });

    await prisma.task.create({
      data: {
        requestId: request.id,
        role: "TRANSLATE",
        status: "OPEN",
      },
    });

    if (isQueueEnabled()) {
      try {
        await enqueueAiDraft(request.id);
      } catch (e) {
        console.error("[lingohub] enqueueAiDraft failed, inline AI fallback:", e.message);
        let fallback = "";
        try {
          fallback = await fetchDraftTranslation({
            text: trimmed,
            sourceLang,
            targetLang,
            domain: domain || "general",
          });
        } catch {
          fallback = `[AI unavailable] ${trimmed.slice(0, 200)}…`;
        }
        await prisma.translationRequest.update({
          where: { id: request.id },
          data: { aiDraft: fallback },
        });
      }
    }

    req.app.get("io")?.emit("translation:update", { requestId: request.id, status: request.status });

    res.status(201).json({ request });
  } catch (e) {
    console.error(e);
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
    }
    res.status(500).json({ error: "Document translation request failed" });
  }
});

export default router;
