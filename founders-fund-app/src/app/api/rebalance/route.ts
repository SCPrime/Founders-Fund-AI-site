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
    const { session, error: authError } = await requireAuth();
    if (authError) {
      return authError;
    }

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

    if (portfolio.userId && portfolio.userId !== session!.user.id) {
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
    // Save rebalancing results to Allocation table for tracking
    const now = new Date();
    const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Calculate realized profit from rebalancing actions (sum of SELL actions)
    const realizedProfit = result.actions
      .filter((action) => action.action === 'SELL')
      .reduce((sum, action) => sum + action.value, 0);

    // Calculate unrealized PNL (difference between current and target allocations)
    const unrealizedPnl = result.currentPositions.reduce((sum, pos) => {
      const target = result.config.targetAllocations.find((t) => t.symbol === pos.symbol);
      if (!target) return sum;
      const targetValue = (result.config.totalValue * target.targetPercent) / 100;
      return sum + (pos.value - targetValue);
    }, 0);

    // Calculate management fee (if applicable - 2% annual, prorated for 30 days)
    const managementFee = result.config.totalValue * 0.02 * (30 / 365);

    // Calculate end capital (total value after rebalancing)
    const endCapital = result.config.totalValue - result.estimatedFees - managementFee;

    // Save allocation record
    const allocation = await prisma.allocation.create({
      data: {
        portfolioId,
        userId: session!.user.id,
        windowStart,
        windowEnd: now,
        realizedProfit,
        unrealizedPnl,
        managementFee,
        endCapital,
      },
    });

    return NextResponse.json({
      success: true,
      result,
      allocation: {
        id: allocation.id,
        windowStart: allocation.windowStart,
        windowEnd: allocation.windowEnd,
        realizedProfit: Number(allocation.realizedProfit),
        unrealizedPnl: Number(allocation.unrealizedPnl),
        managementFee: allocation.managementFee ? Number(allocation.managementFee) : null,
        endCapital: Number(allocation.endCapital),
        createdAt: allocation.createdAt,
      },
      message: 'Rebalancing executed and saved to allocation history',
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
    const { session, error: authError } = await requireAuth();
    if (authError) {
      return authError;
    }
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

    if (portfolio.userId && portfolio.userId !== session!.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to portfolio' }, { status: 403 });
    }

    // Get allocation history (actual completed allocations)
    const allocations = await prisma.allocation.findMany({
      where: { portfolioId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50 allocations
    });

    return NextResponse.json({
      success: true,
      allocations: allocations.map((r) => ({
        id: r.id,
        userId: r.userId,
        windowStart: r.windowStart,
        windowEnd: r.windowEnd,
        realizedProfit: Number(r.realizedProfit),
        unrealizedPnl: Number(r.unrealizedPnl),
        managementFee: r.managementFee ? Number(r.managementFee) : null,
        endCapital: Number(r.endCapital),
        createdAt: r.createdAt,
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
