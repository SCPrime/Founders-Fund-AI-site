/**
 * Admin System Statistics API
 *
 * GET: Get system-wide statistics for admin dashboard
 */

import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Require ADMIN role
    const { error } = await requireRole('ADMIN');
    if (error) return error;

    // Get all statistics in parallel
    const [
      totalUsers,
      usersByRole,
      totalPortfolios,
      totalAgents,
      activeAgents,
      totalTrades,
      totalScans,
      totalReports,
      recentActivity,
    ] = await Promise.all([
      // User statistics
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),

      // Portfolio statistics
      prisma.portfolio.count(),

      // Agent statistics
      prisma.agent.count(),
      prisma.agent.count({ where: { status: 'ACTIVE' } }),

      // Trade statistics
      prisma.trade.count(),

      // Scan statistics
      prisma.scan.count(),

      // Report statistics
      prisma.scanReport.count(),

      // Recent activity (last 7 days)
      prisma.user.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          updatedAt: true,
          _count: {
            select: {
              portfolios: true,
            },
          },
        },
      }),
    ]);

    // Format users by role
    const roleBreakdown = usersByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate portfolio value (if we have allocation data)
    const portfoliosWithValue = await prisma.portfolio.findMany({
      select: {
        id: true,
        totalValue: true,
        snapshots: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          select: {
            profitTotal: true,
            realizedProfit: true,
            unrealizedPnl: true,
          },
        },
      },
    });

    const totalPortfolioValue = portfoliosWithValue.reduce((sum, p) => {
      // Use portfolio.totalValue if available, otherwise calculate from latest snapshot
      if (p.totalValue) {
        return sum + Number(p.totalValue);
      }
      const latestSnapshot = p.snapshots[0];
      return sum + (latestSnapshot ? Number(latestSnapshot.realizedProfit) + Number(latestSnapshot.unrealizedPnl) : 0);
    }, 0);

    // Get agent performance summary from recent performance snapshots
    const agentPerformance = await prisma.agent.findMany({
      select: {
        id: true,
        status: true,
        allocation: true,
        performance: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          select: {
            totalValue: true,
            realizedPnl: true,
            unrealizedPnl: true,
          },
        },
      },
    });

    const totalAgentValue = agentPerformance.reduce((sum, a) => {
      const latest = a.performance[0];
      return sum + (latest ? Number(latest.totalValue || 0) : Number(a.allocation || 0));
    }, 0);
    const totalAgentPnl = agentPerformance.reduce((sum, a) => {
      const latest = a.performance[0];
      const pnl = latest ? Number(latest.realizedPnl || 0) + Number(latest.unrealizedPnl || 0) : 0;
      return sum + pnl;
    }, 0);

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: {
          ADMIN: roleBreakdown['ADMIN'] || 0,
          FOUNDER: roleBreakdown['FOUNDER'] || 0,
          INVESTOR: roleBreakdown['INVESTOR'] || 0,
        },
      },
      portfolios: {
        total: totalPortfolios,
        totalValue: totalPortfolioValue,
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
        totalValue: totalAgentValue,
        totalPnl: totalAgentPnl,
      },
      activity: {
        totalTrades,
        totalScans,
        totalReports,
      },
      recentActivity: recentActivity.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        portfolioCount: user._count.portfolios,
        lastActive: user.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching system statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch system statistics' }, { status: 500 });
  }
}
