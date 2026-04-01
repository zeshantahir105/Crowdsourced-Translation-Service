import IORedis from "ioredis";
import { isRedisConfigured } from "../queues/redisConnection.js";
import { LINGO_EVENTS_CHANNEL } from "./lingoEvents.js";

let lastRedisBridgeErrorMs = 0;
function warnRedisUnavailable(context, err) {
  const now = Date.now();
  if (now - lastRedisBridgeErrorMs < 15_000) return;
  lastRedisBridgeErrorMs = now;
  console.warn(
    `[lingohub] ${context}: ${err?.message || err} — start Redis (e.g. \`docker compose up -d redis\`) or clear REDIS_URL.`
  );
}

/**
 * Forward worker-published events to Socket.IO (API and worker are separate processes).
 * @param {import('socket.io').Server} io
 */
export function setupRedisBridge(io) {
  if (!isRedisConfigured()) return;

  const url = process.env.REDIS_URL.trim();
  const sub = new IORedis(url, { maxRetriesPerRequest: null });

  sub.on("error", (err) => warnRedisUnavailable("Redis pub/sub", err));

  sub
    .subscribe(LINGO_EVENTS_CHANNEL)
    .then(() => console.log("[lingohub] Redis pub/sub bridge listening (Socket.IO ← worker)"))
    .catch((err) => console.error("[lingohub] Redis subscribe error:", err));

  sub.on("message", (channel, message) => {
    if (channel !== LINGO_EVENTS_CHANNEL) return;
    try {
      const { event, data } = JSON.parse(message);
      if (event === "translation:update") io.emit("translation:update", data);
    } catch (e) {
      console.warn("[lingohub] Bad redis event payload:", e.message);
    }
  });
}
