/**
 * Backtesting API
 *
 * POST /api/backtest
 * Run backtest simulation with given strategy and historical data
 */

import { requireAuth } from '@/lib/auth';
import { BacktestConfig, BacktestEngine, HistoricalPriceData } from '@/lib/backtestEngine';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { config, historicalData } = body;

    if (!config || !historicalData) {
      return NextResponse.json(
        { error: 'Config and historicalData are required' },
        { status: 400 },
      );
    }

    // Validate config
    if (!config.strategy || !config.initialCapital || !config.startDate || !config.endDate) {
      return NextResponse.json({ error: 'Invalid backtest configuration' }, { status: 400 });
    }

    // Validate historical data
    if (!Array.isArray(historicalData) || historicalData.length === 0) {
      return NextResponse.json(
        { error: 'Historical data must be a non-empty array' },
        { status: 400 },
      );
    }

    // Run backtest
    const result = await BacktestEngine.runBacktest(
      config as BacktestConfig,
      historicalData as HistoricalPriceData[],
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Backtest API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run backtest',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/backtest
 * Get API information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Backtesting API',
    description: 'Run backtest simulations with trading strategies',
    endpoint: '/api/backtest',
    method: 'POST',
    requiredFields: {
      config: {
        strategy: 'MACD | RSI | MACD_RSI_COMBO | CUSTOM',
        initialCapital: 'Starting capital amount',
        startDate: 'ISO date string',
        endDate: 'ISO date string',
        symbol: 'Token symbol',
      },
      historicalData: 'Array of { timestamp, open, high, low, close, volume }',
    },
    optionalFields: {
      macdFast: 'MACD fast period (default: 12)',
      macdSlow: 'MACD slow period (default: 26)',
      macdSignal: 'MACD signal period (default: 9)',
      rsiPeriod: 'RSI period (default: 14)',
      rsiOverbought: 'RSI overbought level (default: 70)',
      rsiOversold: 'RSI oversold level (default: 30)',
      positionSize: 'Position size as decimal (default: 0.1 = 10%)',
      stopLoss: 'Stop loss as decimal (e.g., 0.05 = 5%)',
      takeProfit: 'Take profit as decimal (e.g., 0.10 = 10%)',
    },
  });
}
