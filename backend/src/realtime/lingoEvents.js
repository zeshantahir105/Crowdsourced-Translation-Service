export const LINGO_EVENTS_CHANNEL = "lingohub:events";

/**
 * @param {import('ioredis').default} redis
 * @param {{ event: string; data: unknown }} payload
 */
export async function publishLingoEvent(redis, payload) {
  await redis.publish(LINGO_EVENTS_CHANNEL, JSON.stringify(payload));
}
