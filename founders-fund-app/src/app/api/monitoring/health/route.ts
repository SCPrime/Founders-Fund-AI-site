/**
 * Enhanced Health Check Endpoint
 *
 * Provides detailed system health information for monitoring
 */

import { prisma } from '@/lib/prisma';
import { applySecurityHeaders } from '@/lib/security';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const startTime = Date.now();

    // Check database connectivity
    let dbHealthy = false;
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbHealthy = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Check environment variables
    const envCheck = {
      database: !!process.env.DATABASE_URL,
      nextAuth: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: !!process.env.NEXTAUTH_URL,
    };

    const totalLatency = Date.now() - startTime;

    const health = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      latency: {
        total: totalLatency,
        database: dbLatency,
      },
      services: {
        database: {
          status: dbHealthy ? 'up' : 'down',
          latency: dbLatency,
        },
      },
      environment: envCheck,
    };

    const response = NextResponse.json(health, {
      status: dbHealthy ? 200 : 503,
    });

    return applySecurityHeaders(response);
  } catch (error) {
    console.error('Health check error:', error);
    const response = NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 },
    );
    return applySecurityHeaders(response);
  }
}
