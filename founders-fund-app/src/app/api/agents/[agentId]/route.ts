import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AgentStatus } from '@prisma/client';

// GET /api/agents/[agentId] - Get specific agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        trades: {
          orderBy: { timestamp: 'desc' },
          take: 50 // Latest 50 trades
        },
        performance: {
          orderBy: { timestamp: 'desc' },
          take: 30 // Last 30 performance snapshots
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Calculate aggregate metrics
    const totalTrades = agent.trades.length;
    const winningTrades = agent.trades.filter(t => t.pnl && Number(t.pnl) > 0).length;
    const losingTrades = agent.trades.filter(t => t.pnl && Number(t.pnl) < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const latestPerf = agent.performance[0];
    const totalPnl = latestPerf ? Number(latestPerf.realizedPnl) + Number(latestPerf.unrealizedPnl) : 0;

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        symbol: agent.symbol,
        status: agent.status,
        allocation: agent.allocation,
        strategy: agent.strategy,
        deployed: agent.deployed,
        totalValue: latestPerf?.totalValue || agent.allocation,
        realizedPnl: latestPerf?.realizedPnl || 0,
        unrealizedPnl: latestPerf?.unrealizedPnl || 0,
        totalPnl,
        winRate,
        totalTrades,
        winningTrades,
        losingTrades,
        sharpeRatio: latestPerf?.sharpeRatio,
        maxDrawdown: latestPerf?.maxDrawdown
      },
      trades: agent.trades,
      performanceHistory: agent.performance
    });
  } catch (error: unknown) {
    console.error('Agent fetch failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[agentId] - Update agent (pause/resume/close)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { action, status, strategy } = body;

    // Handle different actions
    if (action) {
      let newStatus: AgentStatus;

      switch (action) {
        case 'pause':
          newStatus = AgentStatus.PAUSED;
          break;
        case 'resume':
          newStatus = AgentStatus.ACTIVE;
          break;
        case 'close':
          newStatus = AgentStatus.CLOSED;
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid action. Use: pause, resume, or close' },
            { status: 400 }
          );
      }

      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: { status: newStatus }
      });

      return NextResponse.json({
        agent,
        message: `Agent ${action}d successfully`
      });
    }

    // Handle direct status or strategy updates
    const updateData: { status?: AgentStatus; strategy?: Record<string, unknown> } = {};
    if (status) updateData.status = status;
    if (strategy) updateData.strategy = strategy as Record<string, unknown>;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: updateData
    });

    return NextResponse.json({ agent, message: 'Agent updated successfully' });
  } catch (error: unknown) {
    console.error('Agent update failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[agentId] - Delete agent (hard delete, use with caution)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    // Check if agent exists and is already closed
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.status !== AgentStatus.CLOSED) {
      return NextResponse.json(
        { error: 'Agent must be closed before deletion' },
        { status: 400 }
      );
    }

    // Delete agent (cascades to trades and performance)
    await prisma.agent.delete({
      where: { id: agentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Agent deletion failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
