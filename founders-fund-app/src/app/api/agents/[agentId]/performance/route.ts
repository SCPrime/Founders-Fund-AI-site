import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/agents/[agentId]/performance - Get performance metrics and history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;

    // Get agent with performance history
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        performance: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { timestamp: 'asc' }
        },
        trades: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Calculate comprehensive metrics
    const latestPerf = agent.performance[agent.performance.length - 1];
    const firstPerf = agent.performance[0];

    // Calculate returns
    const totalReturn = firstPerf
      ? ((Number(latestPerf?.totalValue || 0) - Number(firstPerf.totalValue)) / Number(firstPerf.totalValue)) * 100
      : 0;

    // Calculate Sharpe ratio (simplified)
    const returns = agent.performance.map((p, i) => {
      if (i === 0) return 0;
      const prev = agent.performance[i - 1];
      return ((Number(p.totalValue) - Number(prev.totalValue)) / Number(prev.totalValue)) * 100;
    }).filter(r => r !== 0);

    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const stdDev = returns.length > 0
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
      : 0;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Calculate max drawdown
    let maxValue = Number(firstPerf?.totalValue || 0);
    let maxDrawdown = 0;
    agent.performance.forEach(p => {
      const value = Number(p.totalValue);
      if (value > maxValue) {
        maxValue = value;
      } else {
        const drawdown = ((maxValue - value) / maxValue) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    });

    // Trade statistics
    const totalTrades = agent.trades.length;
    const tradesWithPnl = agent.trades.filter(t => t.pnl !== null);
    const winningTrades = tradesWithPnl.filter(t => Number(t.pnl) > 0);
    const losingTrades = tradesWithPnl.filter(t => Number(t.pnl) < 0);

    const winRate = tradesWithPnl.length > 0 ? (winningTrades.length / tradesWithPnl.length) * 100 : 0;
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + Number(t.pnl), 0) / losingTrades.length)
      : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;

    const metrics = {
      totalValue: latestPerf?.totalValue || agent.allocation,
      realizedPnl: latestPerf?.realizedPnl || 0,
      unrealizedPnl: latestPerf?.unrealizedPnl || 0,
      totalPnl: Number(latestPerf?.realizedPnl || 0) + Number(latestPerf?.unrealizedPnl || 0),
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin,
      avgLoss,
      profitFactor
    };

    return NextResponse.json({
      metrics,
      performanceHistory: agent.performance,
      recentTrades: agent.trades.slice(-20) // Last 20 trades
    });
  } catch (error: unknown) {
    console.error('Performance fetch failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch performance' },
      { status: 500 }
    );
  }
}

// POST /api/agents/[agentId]/performance - Create performance snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { totalValue, realizedPnl, unrealizedPnl, winRate, sharpeRatio, maxDrawdown } = body;

    // Validate required fields
    if (totalValue === undefined || realizedPnl === undefined || unrealizedPnl === undefined) {
      return NextResponse.json(
        { error: 'totalValue, realizedPnl, and unrealizedPnl are required' },
        { status: 400 }
      );
    }

    // Create performance snapshot
    const performance = await prisma.agentPerformance.create({
      data: {
        agentId,
        totalValue,
        realizedPnl,
        unrealizedPnl,
        winRate,
        sharpeRatio,
        maxDrawdown
      }
    });

    return NextResponse.json({
      performance,
      message: 'Performance snapshot created successfully'
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Performance creation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create performance snapshot' },
      { status: 500 }
    );
  }
}
