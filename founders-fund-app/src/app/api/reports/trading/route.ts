import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';

// Type definitions
interface TradingMetrics {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  totalVolume: number;
  totalFees: number;
  avgTradeSize: number;
  avgFeePerTrade: number;
  profitableTrades: number;
  losingTrades: number;
  winRate: number;
}

interface AgentTradingData {
  agentId: string;
  agentName: string;
  symbol: string;
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  volume: number;
  fees: number;
  avgTradeSize: number;
  profitableTrades: number;
  winRate: number;
  totalPnl: number;
}

interface TokenPerformance {
  symbol: string;
  totalTrades: number;
  volume: number;
  totalPnl: number;
  avgPnl: number;
  winRate: number;
}

interface TradeFrequencyData {
  date: string;
  hour: number;
  count: number;
}

/**
 * GET /api/reports/trading
 * Calculate comprehensive trading analytics
 * Query params:
 *   - portfolioId: string (optional)
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, userRole } = await getAuthContext();
    const { searchParams } = new URL(request.url);

    const portfolioId = searchParams.get('portfolioId');
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Build portfolio filter based on role
    const portfolioFilter: any = {};
    if (portfolioId) {
      portfolioFilter.id = portfolioId;
    }

    // INVESTOR role can only see their own portfolios
    if (userRole === 'INVESTOR') {
      portfolioFilter.userId = userId;
    }

    // Fetch all trades with agent information
    const agents = await prisma.agent.findMany({
      where: {
        portfolio: portfolioFilter,
        deployed: {
          lte: endDate,
        },
      },
      include: {
        trades: {
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: {
            timestamp: 'asc',
          },
        },
      },
    });

    // Calculate portfolio-level trading metrics
    const allTrades = agents.flatMap(a => a.trades);
    const totalTrades = allTrades.length;
    const buyTrades = allTrades.filter(t => t.side === 'BUY').length;
    const sellTrades = allTrades.filter(t => t.side === 'SELL').length;
    const totalVolume = allTrades.reduce((sum, t) => sum + Number(t.amount) * Number(t.price), 0);
    const totalFees = allTrades.reduce((sum, t) => sum + Number(t.fees), 0);
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
    const avgFeePerTrade = totalTrades > 0 ? totalFees / totalTrades : 0;
    const profitableTrades = allTrades.filter(t => t.pnl && Number(t.pnl) > 0).length;
    const losingTrades = allTrades.filter(t => t.pnl && Number(t.pnl) < 0).length;
    const winRate = (profitableTrades + losingTrades) > 0
      ? (profitableTrades / (profitableTrades + losingTrades)) * 100
      : 0;

    const portfolioMetrics: TradingMetrics = {
      totalTrades,
      buyTrades,
      sellTrades,
      totalVolume,
      totalFees,
      avgTradeSize,
      avgFeePerTrade,
      profitableTrades,
      losingTrades,
      winRate,
    };

    // Calculate agent-level trading data
    const agentTradingData: AgentTradingData[] = agents.map((agent) => {
      const trades = agent.trades;
      const totalTrades = trades.length;
      const buyTrades = trades.filter(t => t.side === 'BUY').length;
      const sellTrades = trades.filter(t => t.side === 'SELL').length;
      const volume = trades.reduce((sum, t) => sum + Number(t.amount) * Number(t.price), 0);
      const fees = trades.reduce((sum, t) => sum + Number(t.fees), 0);
      const avgTradeSize = totalTrades > 0 ? volume / totalTrades : 0;
      const profitableTrades = trades.filter(t => t.pnl && Number(t.pnl) > 0).length;
      const totalWithPnl = trades.filter(t => t.pnl !== null).length;
      const winRate = totalWithPnl > 0 ? (profitableTrades / totalWithPnl) * 100 : 0;
      const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ? Number(t.pnl) : 0), 0);

      return {
        agentId: agent.id,
        agentName: agent.name,
        symbol: agent.symbol,
        totalTrades,
        buyTrades,
        sellTrades,
        volume,
        fees,
        avgTradeSize,
        profitableTrades,
        winRate,
        totalPnl,
      };
    });

    // Token performance (aggregate by symbol)
    const tokenMap = new Map<string, {
      trades: number;
      volume: number;
      pnl: number;
      profitable: number;
      total: number;
    }>();

    agents.forEach((agent) => {
      const existing = tokenMap.get(agent.symbol) || {
        trades: 0,
        volume: 0,
        pnl: 0,
        profitable: 0,
        total: 0,
      };

      agent.trades.forEach((trade) => {
        existing.trades += 1;
        existing.volume += Number(trade.amount) * Number(trade.price);
        if (trade.pnl) {
          existing.pnl += Number(trade.pnl);
          existing.total += 1;
          if (Number(trade.pnl) > 0) {
            existing.profitable += 1;
          }
        }
      });

      tokenMap.set(agent.symbol, existing);
    });

    const tokenPerformance: TokenPerformance[] = Array.from(tokenMap.entries()).map(
      ([symbol, data]) => ({
        symbol,
        totalTrades: data.trades,
        volume: data.volume,
        totalPnl: data.pnl,
        avgPnl: data.total > 0 ? data.pnl / data.total : 0,
        winRate: data.total > 0 ? (data.profitable / data.total) * 100 : 0,
      })
    );

    // Most profitable tokens
    const mostProfitable = [...tokenPerformance]
      .sort((a, b) => b.totalPnl - a.totalPnl)
      .slice(0, 5);

    // Least profitable tokens
    const leastProfitable = [...tokenPerformance]
      .sort((a, b) => a.totalPnl - b.totalPnl)
      .slice(0, 5);

    // Trade frequency heatmap (by date and hour)
    const frequencyMap = new Map<string, number>();

    allTrades.forEach((trade) => {
      const date = trade.timestamp.toISOString().split('T')[0];
      const hour = trade.timestamp.getHours();
      const key = `${date}-${hour}`;
      frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
    });

    const tradeFrequency: TradeFrequencyData[] = Array.from(frequencyMap.entries()).map(
      ([key, count]) => {
        const [date, hour] = key.split('-');
        return {
          date,
          hour: parseInt(hour),
          count,
        };
      }
    );

    // Best performing agents by win rate
    const bestAgents = [...agentTradingData]
      .filter(a => a.totalTrades >= 5) // Minimum 5 trades
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);

    // Worst performing agents
    const worstAgents = [...agentTradingData]
      .filter(a => a.totalTrades >= 5)
      .sort((a, b) => a.totalPnl - b.totalPnl)
      .slice(0, 5);

    // Trade volume over time (daily)
    const volumeByDate = new Map<string, number>();
    allTrades.forEach((trade) => {
      const date = trade.timestamp.toISOString().split('T')[0];
      const volume = Number(trade.amount) * Number(trade.price);
      volumeByDate.set(date, (volumeByDate.get(date) || 0) + volume);
    });

    const volumeTimeSeries = Array.from(volumeByDate.entries())
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Slippage analysis (placeholder - would require expected vs actual price)
    const avgSlippage = 0.001; // 0.1% placeholder

    return NextResponse.json({
      success: true,
      data: {
        portfolio: portfolioMetrics,
        agents: agentTradingData,
        tokens: {
          all: tokenPerformance,
          mostProfitable,
          leastProfitable,
        },
        bestAgents,
        worstAgents,
        tradeFrequency,
        volumeTimeSeries,
        slippage: {
          average: avgSlippage * 100,
          total: totalVolume * avgSlippage,
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('Trading analytics error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate trading analytics', details: error.message },
      { status: 500 }
    );
  }
}
