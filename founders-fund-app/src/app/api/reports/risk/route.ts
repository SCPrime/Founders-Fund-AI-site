import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import {
  calculateVaR,
  calculateCVaR,
  calculateRollingVolatility,
  calculateCorrelationMatrix,
  calculateConcentrationRisk,
  calculateLiquidityScore,
} from '@/lib/analytics';

// Type definitions
interface AgentRiskData {
  agentId: string;
  agentName: string;
  symbol: string;
  allocation: number;
  allocationPercent: number;
  volatility: number;
  var95: number;
  cvar95: number;
  maxDrawdown: number;
}

interface RiskMetrics {
  portfolioVolatility: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  concentrationRisk: number;
  liquidityScore: number;
  topHoldings: Array<{
    agentName: string;
    symbol: string;
    percent: number;
  }>;
}

/**
 * GET /api/reports/risk
 * Calculate comprehensive risk analytics
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

    // Fetch agents with trades and performance data
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
        performance: {
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

    // Calculate returns for each agent
    const agentReturnsMap: Record<string, number[]> = {};
    const agentRiskData: AgentRiskData[] = [];
    let totalAllocation = 0;

    agents.forEach((agent) => {
      const allocation = Number(agent.allocation);
      totalAllocation += allocation;

      const trades = agent.trades;
      const returns = trades
        .filter(t => t.pnl !== null)
        .map(t => Number(t.pnl) / allocation);

      agentReturnsMap[agent.name] = returns;

      // Calculate agent-level risk metrics
      const var95 = calculateVaR(returns, 0.95);
      const cvar95 = calculateCVaR(returns, 0.95);
      const volatilities = calculateRollingVolatility(returns, 30, 252);
      const avgVolatility = volatilities.length > 0
        ? volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length
        : 0;

      // Calculate max drawdown from performance snapshots
      const perfValues = agent.performance.map(p => Number(p.totalValue));
      let maxDrawdown = 0;
      if (perfValues.length > 0) {
        let peak = perfValues[0];
        for (const value of perfValues) {
          if (value > peak) peak = value;
          const drawdown = (value - peak) / peak;
          if (drawdown < maxDrawdown) maxDrawdown = drawdown;
        }
      }

      agentRiskData.push({
        agentId: agent.id,
        agentName: agent.name,
        symbol: agent.symbol,
        allocation,
        allocationPercent: 0, // Will calculate after total is known
        volatility: avgVolatility,
        var95: var95 * 100, // Convert to percentage
        cvar95: cvar95 * 100,
        maxDrawdown: maxDrawdown * 100,
      });
    });

    // Update allocation percentages
    agentRiskData.forEach((agent) => {
      agent.allocationPercent = totalAllocation > 0
        ? (agent.allocation / totalAllocation) * 100
        : 0;
    });

    // Calculate portfolio-level risk metrics
    const allReturns = Object.values(agentReturnsMap).flat();
    const portfolioReturns = allReturns.length > 0 ? allReturns : [0];

    const var95 = calculateVaR(portfolioReturns, 0.95);
    const var99 = calculateVaR(portfolioReturns, 0.99);
    const cvar95 = calculateCVaR(portfolioReturns, 0.95);
    const cvar99 = calculateCVaR(portfolioReturns, 0.99);

    const volatilities = calculateRollingVolatility(portfolioReturns, 30, 252);
    const portfolioVolatility = volatilities.length > 0
      ? volatilities[volatilities.length - 1]
      : 0;

    // Calculate concentration risk (HHI)
    const allocations = agentRiskData.map(a => a.allocationPercent / 100);
    const concentrationRisk = calculateConcentrationRisk(allocations);

    // Calculate liquidity score
    const positionValues = agentRiskData.map(a => a.allocation);
    // Placeholder: assume each position has $100k daily volume
    const tradingVolumes = agentRiskData.map(() => 100000);
    const liquidityScore = calculateLiquidityScore(positionValues, tradingVolumes);

    // Top holdings by allocation
    const topHoldings = [...agentRiskData]
      .sort((a, b) => b.allocationPercent - a.allocationPercent)
      .slice(0, 5)
      .map(a => ({
        agentName: a.agentName,
        symbol: a.symbol,
        percent: a.allocationPercent,
      }));

    // Calculate correlation matrix
    const correlationMatrix = calculateCorrelationMatrix(agentReturnsMap);

    // Rolling volatility time series (30-day window)
    const rollingVol = calculateRollingVolatility(portfolioReturns, 30, 252);
    const volatilityTimeSeries = rollingVol.map((vol, index) => ({
      day: index + 30,
      volatility: vol * 100, // Convert to percentage
    }));

    const riskMetrics: RiskMetrics = {
      portfolioVolatility: portfolioVolatility * 100,
      var95: var95 * 100,
      var99: var99 * 100,
      cvar95: cvar95 * 100,
      cvar99: cvar99 * 100,
      concentrationRisk: concentrationRisk * 100,
      liquidityScore,
      topHoldings,
    };

    return NextResponse.json({
      success: true,
      data: {
        portfolio: riskMetrics,
        agents: agentRiskData,
        correlationMatrix,
        volatilityTimeSeries,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('Risk analytics error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to calculate risk analytics', details: error.message },
      { status: 500 }
    );
  }
}
