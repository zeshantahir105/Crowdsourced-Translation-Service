import IORedis from "ioredis";

/** BullMQ requires maxRetriesPerRequest: null on the ioredis instance. */
export function createBullConnection() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("REDIS_URL is not set");
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim());
}
