import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../db.js";
import { fetchDraftTranslation } from "../services/aiClient.js";
import { createBullConnection, isRedisConfigured } from "../queues/redisConnection.js";
import { JOB_AI_DRAFT, LINGOHUB_QUEUE_NAME } from "../queues/lingoHubQueue.js";
import { LINGO_EVENTS_CHANNEL, publishLingoEvent } from "../realtime/lingoEvents.js";

if (!isRedisConfigured()) {
  console.error("Set REDIS_URL to run the LingoHub worker.");
  process.exit(1);
}

const publisher = new IORedis(process.env.REDIS_URL.trim());

const worker = new Worker(
  LINGOHUB_QUEUE_NAME,
  async (job) => {
    if (job.name !== JOB_AI_DRAFT) return;

    const { requestId } = job.data;
    if (!requestId) throw new Error("requestId required");

    const row = await prisma.translationRequest.findUnique({ where: { id: requestId } });
    if (!row) {
      console.warn(`[worker] Skip ai-draft: request ${requestId} not found`);
      return;
    }

    let aiDraft = "";
    try {
      aiDraft = await fetchDraftTranslation({
        text: row.sourceText,
        sourceLang: row.sourceLang,
        targetLang: row.targetLang,
        domain: row.domain || "general",
      });
    } catch (e) {
      console.warn(`[worker] AI draft failed for ${requestId}:`, e.message);
      const existing = row.aiDraft;
      const keepExisting =
        existing &&
        !String(existing).startsWith("[AI unavailable]") &&
        !String(existing).startsWith("[Preview unavailable]");
      if (keepExisting) {
        await publishLingoEvent(publisher, {
          event: "translation:update",
          data: { requestId, status: row.status },
        });
        return;
      }
      aiDraft = `[AI unavailable] ${row.sourceText.slice(0, 200)}…`;
    }

    await prisma.translationRequest.update({
      where: { id: requestId },
      data: { aiDraft },
    });

    await publishLingoEvent(publisher, {
      event: "translation:update",
      data: { requestId, status: row.status },
    });

    console.log(`[worker] ai-draft done requestId=${requestId}`);
  },
  { connection: createBullConnection() }
);

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err?.message);
});

async function shutdown() {
  console.log("[worker] Shutting down…");
  await worker.close();
  await publisher.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[lingohub] Worker listening on queue "${LINGOHUB_QUEUE_NAME}" (job: ${JOB_AI_DRAFT})`);
