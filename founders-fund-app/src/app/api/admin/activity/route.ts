/**
 * Admin Activity Logs API
 *
 * GET: Get user activity logs with filtering and pagination
 */

import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Require ADMIN role
    const { error } = await requireRole('ADMIN');
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause for activity tracking
    // We'll track activity through various models (Portfolio updates, Agent actions, etc.)
    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      where.updatedAt = dateFilter;
    }

    // Get recent portfolio updates (as a proxy for user activity)
    const [portfolios] = await Promise.all([
      prisma.portfolio.findMany({
        where: userId ? { userId } : {},
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          userId: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          updatedAt: true,
          createdAt: true,
          _count: {
            select: {
              agents: true,
              snapshots: true,
              scanReports: true,
            },
          },
        },
      }),
      prisma.portfolio.count({
        where: userId ? { userId } : {},
      }),
    ]);

    // Get recent agent actions
    const recentAgents = await prisma.agent.findMany({
      where: userId ? { portfolio: { userId } } : {},
      take: 20,
      orderBy: { deployed: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        deployed: true,
        portfolio: {
          select: {
            userId: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Format activity logs
    const activityLogs = [
      ...portfolios.map((p) => ({
        type: 'PORTFOLIO_UPDATE' as const,
        userId: p.userId,
        userName: p.owner?.name || 'Unknown',
        userEmail: p.owner?.email || 'Unknown',
        resourceId: p.id,
        resourceType: 'portfolio',
        timestamp: p.updatedAt.toISOString(),
        metadata: {
          agentCount: p._count.agents,
          snapshotCount: p._count.snapshots,
          scanCount: p._count.scanReports,
        },
      })),
      ...recentAgents.map((a) => ({
        type: 'AGENT_UPDATE' as const,
        userId: a.portfolio?.userId || null,
        userName: a.portfolio?.owner?.name || 'Unknown',
        userEmail: a.portfolio?.owner?.email || 'Unknown',
        resourceId: a.id,
        resourceType: 'agent',
        timestamp: a.deployed.toISOString(),
        metadata: {
          agentName: a.name,
          status: a.status,
        },
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      activities: activityLogs.slice(0, limit),
      pagination: {
        page,
        limit,
        total: activityLogs.length,
        totalPages: Math.ceil(activityLogs.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
