/**
 * Admin Monitoring API
 *
 * GET: Get system monitoring data (errors, performance metrics)
 */

import { requireRole } from '@/lib/auth';
import { monitoring } from '@/lib/monitoring';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Require ADMIN role
    const { session, error } = await requireRole('ADMIN');
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'errors' | 'metrics' | 'all'

    const response: any = {};

    if (type === 'errors' || type === 'all') {
      const limit = parseInt(searchParams.get('errorLimit') || '50');
      response.errors = {
        recent: monitoring.getRecentErrors(limit),
        stats: monitoring.getErrorStats(),
      };
    }

    if (type === 'metrics' || type === 'all') {
      const limit = parseInt(searchParams.get('metricLimit') || '50');
      response.metrics = {
        recent: monitoring.getRecentMetrics(limit),
        stats: monitoring.getPerformanceStats(),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json({ error: 'Failed to fetch monitoring data' }, { status: 500 });
  }
}
