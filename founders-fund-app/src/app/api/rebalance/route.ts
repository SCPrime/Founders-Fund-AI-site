/**
 * Portfolio Rebalancing API
 *
 * POST /api/rebalance
 * Calculate and execute portfolio rebalancing
 */

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CurrentPosition, RebalanceConfig, RebalancingEngine } from '@/lib/rebalancing';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const {
      portfolioId,
      targetAllocations,
      currentPositions,
      totalValue,
      calculateOnly = false,
    } = body;

    if (!portfolioId || !targetAllocations || !currentPositions || totalValue === undefined) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: portfolioId, targetAllocations, currentPositions, totalValue',
        },
        { status: 400 },
      );
    }

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId && portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to portfolio' }, { status: 403 });
    }

    // Build config
    const config: RebalanceConfig = {
      portfolioId,
      targetAllocations,
      totalValue: Number(totalValue),
      rebalanceThreshold: body.rebalanceThreshold,
      minRebalanceAmount: body.minRebalanceAmount,
    };

    // Validate config
    const validation = RebalancingEngine.validateConfig(config);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid rebalance configuration', details: validation.errors },
        { status: 400 },
      );
    }

    // Calculate rebalancing
    const result = RebalancingEngine.calculateRebalance(
      config,
      currentPositions as CurrentPosition[],
    );

    // If calculateOnly, return the plan without executing
    if (calculateOnly) {
      return NextResponse.json({
        success: true,
        result,
        message: 'Rebalancing plan calculated',
      });
    }

    // Execute rebalancing (save to database)
    // In a real implementation, this would execute actual trades
    // For now, we'll just save the rebalancing plan
    const rebalanceRecord = await prisma.allocation.create({
      data: {
        portfolioId,
        timestamp: new Date(),
        allocations: JSON.stringify(result.actions),
        metadata: {
          totalRebalanceValue: result.totalRebalanceValue,
          estimatedFees: result.estimatedFees,
          actionCount: result.actions.length,
        } as any,
      },
    });

    return NextResponse.json({
      success: true,
      result,
      rebalanceId: rebalanceRecord.id,
      message: 'Rebalancing plan saved',
    });
  } catch (error) {
    console.error('Rebalancing API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to calculate rebalancing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/rebalance
 * Get rebalancing history for a portfolio
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    if (!portfolioId) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    // Verify portfolio ownership
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    if (portfolio.userId && portfolio.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to portfolio' }, { status: 403 });
    }

    // Get rebalancing history
    const rebalances = await prisma.allocation.findMany({
      where: { portfolioId },
      orderBy: { timestamp: 'desc' },
      take: 50, // Last 50 rebalances
    });

    return NextResponse.json({
      success: true,
      rebalances: rebalances.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        allocations: JSON.parse(r.allocations as string),
        metadata: r.metadata,
      })),
    });
  } catch (error) {
    console.error('Rebalancing history API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch rebalancing history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
