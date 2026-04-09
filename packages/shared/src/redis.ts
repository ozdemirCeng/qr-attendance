import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getQrNonceKey(sessionId: string, nonce: string) {
  return `qr:nonce:${sessionId}:${nonce}`;
}

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is required");
  }

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    enableAutoPipelining: true,
    lazyConnect: true,
  });

  return redisClient;
}