import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TradeSide } from '@prisma/client';

// POST /api/agents/[agentId]/trades - Log new trade
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { side, amount, price, fees, timestamp } = body;

    // Validate required fields
    if (!side || !amount || !price) {
      return NextResponse.json(
        { error: 'side, amount, and price are required' },
        { status: 400 }
      );
    }

    // Validate side
    if (side !== 'BUY' && side !== 'SELL') {
      return NextResponse.json(
        { error: 'side must be BUY or SELL' },
        { status: 400 }
      );
    }

    // Calculate trade value
    const tradeValue = Number(amount) * Number(price);

    // Create trade and update agent metrics in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the trade
      const trade = await tx.trade.create({
        data: {
          agentId,
          side: side as TradeSide,
          amount,
          price,
          fees: fees || 0,
          timestamp: timestamp ? new Date(timestamp) : new Date()
        }
      });

      // Get agent's current state
      const agent = await tx.agent.findUnique({
        where: { id: agentId },
        include: {
          trades: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Calculate PnL for SELL trades
      let pnl = null;
      if (side === 'SELL') {
        // Simple FIFO cost basis calculation
        const buyTrades = agent.trades.filter(t => t.side === 'BUY');
        if (buyTrades.length > 0) {
          const avgBuyPrice = buyTrades.reduce((sum, t) => sum + Number(t.price), 0) / buyTrades.length;
          pnl = (Number(price) - avgBuyPrice) * Number(amount) - Number(fees || 0);

          // Update trade with PnL
          await tx.trade.update({
            where: { id: trade.id },
            data: { pnl }
          });
        }
      }

      // Calculate updated metrics
      const allTrades = [...agent.trades, trade];
      const totalTrades = allTrades.length;
      const tradesWithPnl = allTrades.filter(t => t.pnl !== null);
      const realizedPnl = tradesWithPnl.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
      const winningTrades = tradesWithPnl.filter(t => Number(t.pnl) > 0).length;
      const winRate = tradesWithPnl.length > 0 ? (winningTrades / tradesWithPnl.length) * 100 : 0;

      // Calculate current position value (unrealized P&L)
      const buyAmount = allTrades.filter(t => t.side === 'BUY').reduce((sum, t) => sum + Number(t.amount), 0);
      const sellAmount = allTrades.filter(t => t.side === 'SELL').reduce((sum, t) => sum + Number(t.amount), 0);
      const currentPosition = buyAmount - sellAmount;
      const avgBuyPrice = buyAmount > 0
        ? allTrades.filter(t => t.side === 'BUY').reduce((sum, t) => sum + Number(t.price) * Number(t.amount), 0) / buyAmount
        : 0;
      const unrealizedPnl = currentPosition > 0 ? currentPosition * (Number(price) - avgBuyPrice) : 0;
      const totalValue = Number(agent.allocation) + realizedPnl + unrealizedPnl;

      // Create performance snapshot
      await tx.agentPerformance.create({
        data: {
          agentId,
          totalValue,
          realizedPnl,
          unrealizedPnl,
          winRate
        }
      });

      return { trade, metrics: { totalValue, realizedPnl, unrealizedPnl, winRate, totalTrades } };
    });

    return NextResponse.json({
      trade: result.trade,
      metrics: result.metrics,
      message: 'Trade logged successfully'
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Trade logging failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log trade' },
      { status: 500 }
    );
  }
}

// GET /api/agents/[agentId]/trades - Get all trades for agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const trades = await prisma.trade.findMany({
      where: { agentId },
      orderBy: { timestamp: 'desc' },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined
    });

    const totalCount = await prisma.trade.count({
      where: { agentId }
    });

    return NextResponse.json({
      trades,
      totalCount,
      limit: limit ? parseInt(limit) : totalCount,
      offset: offset ? parseInt(offset) : 0
    });
  } catch (error: unknown) {
    console.error('Trades fetch failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
