import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AgentStatus } from '@prisma/client';

// GET /api/agents - List all agents for a portfolio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'portfolioId is required' },
        { status: 400 }
      );
    }

    // Get all agents with their latest performance and trade counts
    const agents = await prisma.agent.findMany({
      where: { portfolioId },
      include: {
        trades: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        performance: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        _count: {
          select: {
            trades: true
          }
        }
      },
      orderBy: { deployed: 'desc' }
    });

    // Calculate current metrics for each agent
    const agentsWithMetrics = agents.map(agent => {
      const latestPerf = agent.performance[0];
      const tradeCount = agent._count.trades;

      // Calculate win rate from trades
      const allTrades = agent.trades;
      const winningTrades = allTrades.filter(t => t.pnl && Number(t.pnl) > 0).length;
      const winRate = tradeCount > 0 ? (winningTrades / tradeCount) * 100 : 0;

      return {
        id: agent.id,
        name: agent.name,
        symbol: agent.symbol,
        status: agent.status,
        allocation: agent.allocation,
        realizedPnl: latestPerf?.realizedPnl || 0,
        unrealizedPnl: latestPerf?.unrealizedPnl || 0,
        totalValue: latestPerf?.totalValue || agent.allocation,
        winRate: winRate,
        tradeCount: tradeCount,
        deployed: agent.deployed,
        strategy: agent.strategy
      };
    });

    return NextResponse.json({ agents: agentsWithMetrics });
  } catch (error: unknown) {
    console.error('Agents list failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create new AI trading agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portfolioId, name, symbol, strategy, allocation } = body;

    // Validate required fields
    if (!portfolioId || !name || !symbol || !strategy || !allocation) {
      return NextResponse.json(
        { error: 'portfolioId, name, symbol, strategy, and allocation are required' },
        { status: 400 }
      );
    }

    // Validate allocation is positive
    if (Number(allocation) <= 0) {
      return NextResponse.json(
        { error: 'allocation must be positive' },
        { status: 400 }
      );
    }

    // Create agent with initial performance record
    const agent = await prisma.$transaction(async (tx) => {
      // Create the agent
      const newAgent = await tx.agent.create({
        data: {
          portfolioId,
          name,
          symbol: symbol.toUpperCase(),
          strategy,
          allocation,
          status: AgentStatus.ACTIVE
        }
      });

      // Create initial performance snapshot
      await tx.agentPerformance.create({
        data: {
          agentId: newAgent.id,
          totalValue: allocation,
          realizedPnl: 0,
          unrealizedPnl: 0,
          winRate: 0
        }
      });

      return newAgent;
    });

    return NextResponse.json({
      agent,
      message: `Agent ${name} deployed successfully for ${symbol}`
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Agent creation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create agent' },
      { status: 500 }
    );
  }
}
