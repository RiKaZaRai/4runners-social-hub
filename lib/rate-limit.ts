import { redis, ensureRedisConnected } from '@/lib/redis';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  upload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  strict: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  emailTest: { maxRequests: 3, windowMs: 10 * 60 * 1000 } // 3 per 10 minutes
};

/**
 * Check if a request should be rate limited
 * Returns true if the request should be allowed, false if rate limited
 */
export async function checkRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMIT_CONFIGS[type];
  const key = `ratelimit:${type}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    await ensureRedisConnected();
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const requestCount = await redis.zcard(key);

    if (requestCount >= config.maxRequests) {
      // Get the oldest request timestamp to calculate reset time
      const oldestRequests = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldestRequests.length > 0
        ? parseInt(oldestRequests[1]) + config.windowMs
        : now + config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetAt
      };
    }

    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, Math.ceil(config.windowMs / 1000));

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetAt: now + config.windowMs
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs
    };
  }
}

/**
 * Middleware to enforce rate limiting
 */
export async function requireRateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): Promise<void> {
  const result = await checkRateLimit(identifier, type);

  if (!result.allowed) {
    const error: any = new Error('RATE_LIMIT_EXCEEDED');
    error.resetAt = result.resetAt;
    throw error;
  }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}
