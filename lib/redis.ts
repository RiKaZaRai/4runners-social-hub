import { Redis } from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

export async function ensureRedisConnected() {
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
}
