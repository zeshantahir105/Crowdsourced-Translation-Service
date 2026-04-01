import { Queue } from "bullmq";
import { createBullConnection, isRedisConfigured } from "./redisConnection.js";

export const LINGOHUB_QUEUE_NAME = "lingohub-tasks";
export const JOB_AI_DRAFT = "ai-draft";

let queue;
let lastQueueRedisErrorMs = 0;

function warnQueueRedis(err) {
  const now = Date.now();
  if (now - lastQueueRedisErrorMs < 15_000) return;
  lastQueueRedisErrorMs = now;
  console.warn(
    `[lingohub] BullMQ Redis: ${err?.message || err} — start Redis (e.g. \`docker compose up -d redis\`) or clear REDIS_URL.`
  );
}

export function isQueueEnabled() {
  return isRedisConfigured();
}

export function getLingoQueue() {
  if (!isQueueEnabled()) return null;
  if (!queue) {
    const connection = createBullConnection();
    connection.on("error", warnQueueRedis);
    queue = new Queue(LINGOHUB_QUEUE_NAME, {
      connection,
    });
  }
  return queue;
}

export async function closeLingoQueue() {
  if (queue) {
    await queue.close();
    queue = null;
  }
}

/**
 * @param {string} requestId
 */
export async function enqueueAiDraft(requestId) {
  const q = getLingoQueue();
  if (!q) return false;
  await q.add(
    JOB_AI_DRAFT,
    { requestId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    }
  );
  return true;
}
