/**
 * Backtesting Engine
 *
 * Simulates trading strategies against historical price data
 * Supports MACD, RSI, and other technical indicators
 */

export interface HistoricalPriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestConfig {
  strategy: 'MACD' | 'RSI' | 'MACD_RSI_COMBO' | 'CUSTOM';
  initialCapital: number;
  startDate: string;
  endDate: string;
  symbol: string;
  // MACD parameters
  macdFast?: number;
  macdSlow?: number;
  macdSignal?: number;
  // RSI parameters
  rsiPeriod?: number;
  rsiOverbought?: number;
  rsiOversold?: number;
  // Position sizing
  positionSize?: number; // Percentage of capital per trade
  maxPositions?: number;
  // Risk management
  stopLoss?: number; // Percentage
  takeProfit?: number; // Percentage
  // Custom strategy function (optional)
  customStrategy?: (data: HistoricalPriceData[], index: number) => 'BUY' | 'SELL' | 'HOLD';
}

export interface BacktestTrade {
  timestamp: number;
  side: 'BUY' | 'SELL';
  price: number;
  amount: number;
  value: number;
  fees: number;
  pnl?: number;
  reason: string;
}

export interface BacktestResult {
  config: BacktestConfig;
  trades: BacktestTrade[];
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfit: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    profitFactor: number;
    averageWin: number;
    averageLoss: number;
    largestWin: number;
    largestLoss: number;
    finalCapital: number;
  };
  equityCurve: Array<{ timestamp: number; value: number }>;
  drawdownCurve: Array<{ timestamp: number; drawdown: number }>;
}

export class BacktestEngine {
  /**
   * Run backtest with given configuration
   */
  static async runBacktest(
    config: BacktestConfig,
    historicalData: HistoricalPriceData[],
  ): Promise<BacktestResult> {
    const trades: BacktestTrade[] = [];
    const equityCurve: Array<{ timestamp: number; value: number }> = [];
    const drawdownCurve: Array<{ timestamp: number; drawdown: number }> = [];

    let capital = config.initialCapital;
    let position = 0; // Current position size
    let entryPrice = 0;
    let peakCapital = capital;
    const feeRate = 0.001; // 0.1% trading fee

    // Calculate indicators
    const macdData = this.calculateMACD(
      historicalData,
      config.macdFast || 12,
      config.macdSlow || 26,
      config.macdSignal || 9,
    );
    const rsiData = this.calculateRSI(historicalData, config.rsiPeriod || 14);

    // Run simulation
    for (let i = 1; i < historicalData.length; i++) {
      const currentPrice = historicalData[i].close;
      // const prevPrice = historicalData[i - 1].close; // Reserved for future use

      // Determine signal based on strategy
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

      if (config.strategy === 'MACD') {
        signal = this.getMACDSignal(macdData, i);
      } else if (config.strategy === 'RSI') {
        signal = this.getRSISignal(
          rsiData,
          i,
          config.rsiOverbought || 70,
          config.rsiOversold || 30,
        );
      } else if (config.strategy === 'MACD_RSI_COMBO') {
        const macdSignal = this.getMACDSignal(macdData, i);
        const rsiSignal = this.getRSISignal(
          rsiData,
          i,
          config.rsiOverbought || 70,
          config.rsiOversold || 30,
        );
        // Both must agree
        if (macdSignal === 'BUY' && rsiSignal === 'BUY') {
          signal = 'BUY';
        } else if (macdSignal === 'SELL' && rsiSignal === 'SELL') {
          signal = 'SELL';
        }
      } else if (config.strategy === 'CUSTOM' && config.customStrategy) {
        signal = config.customStrategy(historicalData, i);
      }

      // Execute trades
      if (signal === 'BUY' && position === 0) {
        const positionSize = config.positionSize || 0.1; // 10% default
        const tradeValue = capital * positionSize;
        const amount = tradeValue / currentPrice;
        const fees = tradeValue * feeRate;
        const netValue = tradeValue - fees;

        if (netValue > 0 && capital >= tradeValue) {
          position = amount;
          entryPrice = currentPrice;
          capital -= tradeValue;

          trades.push({
            timestamp: historicalData[i].timestamp,
            side: 'BUY',
            price: currentPrice,
            amount,
            value: tradeValue,
            fees,
            reason: `Strategy: ${config.strategy}`,
          });
        }
      } else if (signal === 'SELL' && position > 0) {
        const tradeValue = position * currentPrice;
        const fees = tradeValue * feeRate;
        const netValue = tradeValue - fees;
        const pnl = netValue - position * entryPrice - fees;

        capital += netValue;

        trades.push({
          timestamp: historicalData[i].timestamp,
          side: 'SELL',
          price: currentPrice,
          amount: position,
          value: tradeValue,
          fees,
          pnl,
          reason: `Strategy: ${config.strategy}`,
        });

        position = 0;
        entryPrice = 0;
      }

      // Check stop loss / take profit
      if (position > 0) {
        const currentPnl = (currentPrice - entryPrice) / entryPrice;

        if (config.stopLoss && currentPnl <= -config.stopLoss) {
          // Stop loss triggered
          const tradeValue = position * currentPrice;
          const fees = tradeValue * feeRate;
          const netValue = tradeValue - fees;
          const pnl = netValue - position * entryPrice - fees;

          capital += netValue;

          trades.push({
            timestamp: historicalData[i].timestamp,
            side: 'SELL',
            price: currentPrice,
            amount: position,
            value: tradeValue,
            fees,
            pnl,
            reason: `Stop Loss: ${(config.stopLoss * 100).toFixed(2)}%`,
          });

          position = 0;
          entryPrice = 0;
        } else if (config.takeProfit && currentPnl >= config.takeProfit) {
          // Take profit triggered
          const tradeValue = position * currentPrice;
          const fees = tradeValue * feeRate;
          const netValue = tradeValue - fees;
          const pnl = netValue - position * entryPrice - fees;

          capital += netValue;

          trades.push({
            timestamp: historicalData[i].timestamp,
            side: 'SELL',
            price: currentPrice,
            amount: position,
            value: tradeValue,
            fees,
            pnl,
            reason: `Take Profit: ${(config.takeProfit * 100).toFixed(2)}%`,
          });

          position = 0;
          entryPrice = 0;
        }
      }

      // Update equity curve
      const currentValue = capital + position * currentPrice;
      equityCurve.push({
        timestamp: historicalData[i].timestamp,
        value: currentValue,
      });

      // Update drawdown
      if (currentValue > peakCapital) {
        peakCapital = currentValue;
      }
      const drawdown = (currentValue - peakCapital) / peakCapital;
      drawdownCurve.push({
        timestamp: historicalData[i].timestamp,
        drawdown,
      });
    }

    // Close any remaining position
    if (position > 0 && historicalData.length > 0) {
      const lastPrice = historicalData[historicalData.length - 1].close;
      const tradeValue = position * lastPrice;
      const fees = tradeValue * feeRate;
      const netValue = tradeValue - fees;
      const pnl = netValue - position * entryPrice - fees;

      capital += netValue;

      trades.push({
        timestamp: historicalData[historicalData.length - 1].timestamp,
        side: 'SELL',
        price: lastPrice,
        amount: position,
        value: tradeValue,
        fees,
        pnl,
        reason: 'End of backtest - closing position',
      });
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(config.initialCapital, capital, trades, equityCurve);

    return {
      config,
      trades,
      metrics,
      equityCurve,
      drawdownCurve,
    };
  }

  /**
   * Calculate MACD indicator
   */
  private static calculateMACD(
    data: HistoricalPriceData[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number,
  ): Array<{ macd: number; signal: number; histogram: number }> {
    const closes = data.map((d) => d.close);
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    const macdLine = emaFast.map((fast, i) => fast - emaSlow[i]);
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    const histogram = macdLine.map((macd, i) => macd - (signalLine[i] || 0));

    return macdLine.map((macd, i) => ({
      macd,
      signal: signalLine[i] || 0,
      histogram: histogram[i] || 0,
    }));
  }

  /**
   * Calculate RSI indicator
   */
  private static calculateRSI(data: HistoricalPriceData[], period: number): number[] {
    const closes = data.map((d) => d.close);
    const rsi: number[] = [];

    for (let i = period; i < closes.length; i++) {
      const gains: number[] = [];
      const losses: number[] = [];

      for (let j = i - period + 1; j <= i; j++) {
        const change = closes[j] - closes[j - 1];
        if (change > 0) {
          gains.push(change);
          losses.push(0);
        } else {
          gains.push(0);
          losses.push(Math.abs(change));
        }
      }

      const avgGain = gains.reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    // Pad beginning with NaN
    return Array(period).fill(NaN).concat(rsi);
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  private static calculateEMA(data: number[], period: number): number[] {
    const multiplier = 2 / (period + 1);
    const ema: number[] = [];

    // Start with SMA
    let sum = 0;
    for (let i = 0; i < period && i < data.length; i++) {
      sum += data[i];
    }
    ema.push(sum / period);

    // Calculate EMA
    for (let i = period; i < data.length; i++) {
      ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
    }

    return ema;
  }

  /**
   * Get MACD signal
   */
  private static getMACDSignal(
    macdData: Array<{ macd: number; signal: number; histogram: number }>,
    index: number,
  ): 'BUY' | 'SELL' | 'HOLD' {
    if (index < 1 || index >= macdData.length) return 'HOLD';

    const current = macdData[index];
    const previous = macdData[index - 1];

    // Bullish crossover: MACD crosses above signal
    if (previous.macd <= previous.signal && current.macd > current.signal) {
      return 'BUY';
    }

    // Bearish crossover: MACD crosses below signal
    if (previous.macd >= previous.signal && current.macd < current.signal) {
      return 'SELL';
    }

    return 'HOLD';
  }

  /**
   * Get RSI signal
   */
  private static getRSISignal(
    rsiData: number[],
    index: number,
    overbought: number,
    oversold: number,
  ): 'BUY' | 'SELL' | 'HOLD' {
    if (index >= rsiData.length || isNaN(rsiData[index])) return 'HOLD';

    const rsi = rsiData[index];

    if (rsi < oversold) {
      return 'BUY';
    } else if (rsi > overbought) {
      return 'SELL';
    }

    return 'HOLD';
  }

  /**
   * Calculate backtest metrics
   */
  private static calculateMetrics(
    initialCapital: number,
    finalCapital: number,
    trades: BacktestTrade[],
    equityCurve: Array<{ timestamp: number; value: number }>,
  ) {
    const sellTrades = trades.filter((t) => t.side === 'SELL' && t.pnl !== undefined);
    const winningTrades = sellTrades.filter((t) => (t.pnl || 0) > 0);
    const losingTrades = sellTrades.filter((t) => (t.pnl || 0) <= 0);

    const totalProfit = finalCapital - initialCapital;
    const totalReturn = (totalProfit / initialCapital) * 100;

    const winRate = sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;

    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    const largestWin =
      winningTrades.length > 0 ? Math.max(...winningTrades.map((t) => t.pnl || 0)) : 0;

    const largestLoss =
      losingTrades.length > 0 ? Math.min(...losingTrades.map((t) => t.pnl || 0)) : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = initialCapital;
    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe ratio (simplified)
    const returns = equityCurve.slice(1).map((point, i) => {
      const prevValue = equityCurve[i].value;
      return (point.value - prevValue) / prevValue;
    });

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalProfit,
      totalReturn,
      maxDrawdown: maxDrawdown * 100, // As percentage
      sharpeRatio,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      finalCapital,
    };
  }
}
