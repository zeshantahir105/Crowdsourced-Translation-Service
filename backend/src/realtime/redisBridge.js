import IORedis from "ioredis";
import { isRedisConfigured } from "../queues/redisConnection.js";
import { LINGO_EVENTS_CHANNEL } from "./lingoEvents.js";

/**
 * Forward worker-published events to Socket.IO (API and worker are separate processes).
 * @param {import('socket.io').Server} io
 */
export function setupRedisBridge(io) {
  if (!isRedisConfigured()) return;

  const url = process.env.REDIS_URL.trim();
  const sub = new IORedis(url);

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
