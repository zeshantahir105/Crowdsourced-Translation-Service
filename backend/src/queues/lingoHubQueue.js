import { Queue } from "bullmq";
import { createBullConnection, isRedisConfigured } from "./redisConnection.js";

export const LINGOHUB_QUEUE_NAME = "lingohub-tasks";
export const JOB_AI_DRAFT = "ai-draft";

let queue;

export function isQueueEnabled() {
  return isRedisConfigured();
}

export function getLingoQueue() {
  if (!isQueueEnabled()) return null;
  if (!queue) {
    queue = new Queue(LINGOHUB_QUEUE_NAME, {
      connection: createBullConnection(),
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
