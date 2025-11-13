// Enhanced rate limiting for API endpoints
// For production scale, switch to Redis/Upstash with same interface

const map = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  identifier?: string; // Custom identifier (IP, user ID, etc.)
}

/**
 * Enhanced rate limiting with configurable options
 */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const existing = map.get(key);

  let record = existing ?? { count: 0, resetAt: now + windowMs };

  // Reset window if expired
  if (now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
  }

  record.count += 1;
  map.set(key, record);

  const remaining = Math.max(0, limit - record.count);
  const ok = record.count <= limit;

  return {
    ok,
    remaining,
    resetAt: record.resetAt,
    limit,
  };
}

/**
 * Rate limit by user ID (for authenticated requests)
 */
export function rateLimitByUser(userId: string, limit = 100, windowMs = 60_000): RateLimitResult {
  return rateLimit(`user:${userId}`, limit, windowMs);
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIP(ip: string, limit = 50, windowMs = 60_000): RateLimitResult {
  return rateLimit(`ip:${ip}`, limit, windowMs);
}

/**
 * Stricter rate limiting for sensitive operations
 */
export function strictRateLimit(key: string, limit = 5, windowMs = 60_000): RateLimitResult {
  return rateLimit(key, limit, windowMs);
}

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of map.entries()) {
    if (now > record.resetAt + 300_000) {
      // 5 min grace period
      map.delete(key);
    }
  }
}, 300_000); // Clean every 5 minutes
