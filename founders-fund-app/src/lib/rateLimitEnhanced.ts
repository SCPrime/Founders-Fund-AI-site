/**
 * Enhanced Rate Limiting with Redis-ready interface
 *
 * Current implementation: In-memory (suitable for single-instance deployments)
 * Production: Switch to Redis/Upstash with same interface
 */

import { RateLimitResult, rateLimit } from './rateLimit';

/**
 * Enhanced rate limiting with per-endpoint configuration
 */
export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Default rate limit configurations per endpoint
 */
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/calculate': { limit: 20, windowMs: 60_000 }, // 20/min
  '/api/ocr': { limit: 10, windowMs: 60_000 }, // 10/min
  '/api/admin': { limit: 100, windowMs: 60_000 }, // 100/min for admin
  '/api/agents': { limit: 50, windowMs: 60_000 }, // 50/min
  '/api/reports': { limit: 30, windowMs: 60_000 }, // 30/min
  '/api/integrations': { limit: 60, windowMs: 60_000 }, // 60/min
  default: { limit: 20, windowMs: 60_000 }, // 20/min default
};

/**
 * Get rate limit configuration for an endpoint
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Check for exact match first
  if (rateLimitConfigs[pathname]) {
    return rateLimitConfigs[pathname];
  }

  // Check for prefix match
  for (const [prefix, config] of Object.entries(rateLimitConfigs)) {
    if (pathname.startsWith(prefix)) {
      return config;
    }
  }

  return rateLimitConfigs.default;
}

/**
 * Enhanced rate limit check with automatic configuration
 */
export function rateLimitEnhanced(identifier: string, pathname: string): RateLimitResult {
  const config = getRateLimitConfig(pathname);
  const key = config.keyPrefix ? `${config.keyPrefix}:${identifier}` : identifier;

  return rateLimit(key, config.limit, config.windowMs);
}

/**
 * Rate limit middleware helper for API routes
 */
export function withRateLimit(
  identifier: string,
  pathname: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const result = rateLimitEnhanced(identifier, pathname);

  if (!result.ok) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetAt.toString(),
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        },
      ),
    );
  }

  return handler();
}
