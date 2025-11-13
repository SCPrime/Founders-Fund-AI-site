/**
 * System Metrics Endpoint
 *
 * Provides system performance metrics for monitoring
 */

import { requireRole } from '@/lib/auth';
import cache from '@/lib/cache';
import { applySecurityHeaders } from '@/lib/security';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Require ADMIN role for metrics
    const { error } = await requireRole('ADMIN');
    if (error) return error;

    // Get cache stats
    const cacheStats = cache.getStats();

    // Get memory usage (Node.js only)
    const memoryUsage = process.memoryUsage ? process.memoryUsage() : null;

    const metrics = {
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      memory: memoryUsage
        ? {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          }
        : null,
      uptime: process.uptime(),
      nodeVersion: process.version,
    };

    const response = NextResponse.json(metrics);
    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Metrics error:', error);
    const response = NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    return applySecurityHeaders(response);
  }
}
