// Simple in-memory rate limiting for API endpoints
// For production scale, switch to Redis/Upstash with same interface

const map = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
): RateLimitResult {
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

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of map.entries()) {
    if (now > record.resetAt + 300_000) { // 5 min grace period
      map.delete(key);
    }
  }
}, 300_000); // Clean every 5 minutes