/**
 * Analytics & Statistical Calculations Library
 * Provides comprehensive financial analytics calculations for portfolio and agent performance
 */

/**
 * Calculate Sharpe Ratio
 * Measures risk-adjusted return (excess return per unit of risk)
 *
 * @param returns - Array of period returns (e.g., daily returns)
 * @param riskFreeRate - Risk-free rate (annualized, e.g., 0.04 for 4%)
 * @param periodsPerYear - Number of periods per year (252 for daily, 12 for monthly)
 * @returns Annualized Sharpe ratio
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.04,
  periodsPerYear: number = 252
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const stdDev = calculateStandardDeviation(returns);

  if (stdDev === 0) return 0;

  // Convert to annualized
  const annualizedReturn = avgReturn * periodsPerYear;
  const annualizedStdDev = stdDev * Math.sqrt(periodsPerYear);
  const riskFreePerPeriod = riskFreeRate / periodsPerYear;

  return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}

/**
 * Calculate Sortino Ratio
 * Similar to Sharpe but only penalizes downside volatility
 *
 * @param returns - Array of period returns
 * @param riskFreeRate - Risk-free rate (annualized)
 * @param periodsPerYear - Number of periods per year
 * @returns Annualized Sortino ratio
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0.04,
  periodsPerYear: number = 252
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < 0);
  const downsideDeviation = calculateStandardDeviation(downsideReturns);

  if (downsideDeviation === 0) return 0;

  const annualizedReturn = avgReturn * periodsPerYear;
  const annualizedDownsideDeviation = downsideDeviation * Math.sqrt(periodsPerYear);

  return (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation;
}

/**
 * Calculate Calmar Ratio
 * Measures return relative to maximum drawdown
 *
 * @param returns - Array of period returns
 * @param periodsPerYear - Number of periods per year
 * @returns Calmar ratio
 */
export function calculateCalmarRatio(
  returns: number[],
  periodsPerYear: number = 252
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const annualizedReturn = avgReturn * periodsPerYear;
  const maxDrawdown = calculateMaxDrawdown(returns);

  if (maxDrawdown === 0) return 0;

  return Math.abs(annualizedReturn / maxDrawdown);
}

/**
 * Calculate Maximum Drawdown
 * Maximum peak-to-trough decline in portfolio value
 *
 * @param returns - Array of period returns (or cumulative values)
 * @returns Maximum drawdown as a negative percentage (e.g., -0.25 for 25% drawdown)
 */
export function calculateMaxDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;

  // Convert returns to cumulative equity curve
  let cumulative = 1;
  const equityCurve = returns.map(r => {
    cumulative *= (1 + r);
    return cumulative;
  });

  let maxDrawdown = 0;
  let peak = equityCurve[0];

  for (const value of equityCurve) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (value - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate Current Drawdown
 * Current decline from most recent peak
 *
 * @param returns - Array of period returns
 * @returns Current drawdown as a negative percentage
 */
export function calculateCurrentDrawdown(returns: number[]): number {
  if (returns.length === 0) return 0;

  let cumulative = 1;
  const equityCurve = returns.map(r => {
    cumulative *= (1 + r);
    return cumulative;
  });

  const currentValue = equityCurve[equityCurve.length - 1];
  const peak = Math.max(...equityCurve);

  return (currentValue - peak) / peak;
}

/**
 * Calculate Alpha and Beta
 * Alpha: Excess return over benchmark. Beta: Correlation to benchmark
 *
 * @param portfolioReturns - Array of portfolio returns
 * @param benchmarkReturns - Array of benchmark returns (must be same length)
 * @returns { alpha, beta }
 */
export function calculateAlphaBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): { alpha: number; beta: number } {
  if (portfolioReturns.length === 0 || portfolioReturns.length !== benchmarkReturns.length) {
    return { alpha: 0, beta: 0 };
  }

  const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
  const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;

  let covariance = 0;
  let benchmarkVariance = 0;

  for (let i = 0; i < portfolioReturns.length; i++) {
    const portfolioDiff = portfolioReturns[i] - portfolioMean;
    const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
    covariance += portfolioDiff * benchmarkDiff;
    benchmarkVariance += benchmarkDiff * benchmarkDiff;
  }

  covariance /= portfolioReturns.length;
  benchmarkVariance /= benchmarkReturns.length;

  const beta = benchmarkVariance === 0 ? 0 : covariance / benchmarkVariance;
  const alpha = portfolioMean - beta * benchmarkMean;

  return { alpha, beta };
}

/**
 * Calculate Value at Risk (VaR)
 * Estimates maximum loss over a given time period at a given confidence level
 * Uses historical method
 *
 * @param returns - Array of period returns
 * @param confidenceLevel - Confidence level (e.g., 0.95 for 95%, 0.99 for 99%)
 * @returns VaR as a negative value (e.g., -0.05 means 5% loss)
 */
export function calculateVaR(
  returns: number[],
  confidenceLevel: number = 0.95
): number {
  if (returns.length === 0) return 0;

  const sortedReturns = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);

  return sortedReturns[index] || 0;
}

/**
 * Calculate Conditional Value at Risk (CVaR / Expected Shortfall)
 * Average of all losses worse than VaR
 *
 * @param returns - Array of period returns
 * @param confidenceLevel - Confidence level
 * @returns CVaR as a negative value
 */
export function calculateCVaR(
  returns: number[],
  confidenceLevel: number = 0.95
): number {
  if (returns.length === 0) return 0;

  const var95 = calculateVaR(returns, confidenceLevel);
  const worstReturns = returns.filter(r => r <= var95);

  if (worstReturns.length === 0) return var95;

  return worstReturns.reduce((sum, r) => sum + r, 0) / worstReturns.length;
}

/**
 * Calculate Rolling Volatility
 * Standard deviation over a rolling window
 *
 * @param returns - Array of period returns
 * @param windowSize - Rolling window size (e.g., 30 for 30-day)
 * @param periodsPerYear - Annualization factor
 * @returns Array of annualized volatilities
 */
export function calculateRollingVolatility(
  returns: number[],
  windowSize: number = 30,
  periodsPerYear: number = 252
): number[] {
  if (returns.length < windowSize) return [];

  const volatilities: number[] = [];

  for (let i = windowSize - 1; i < returns.length; i++) {
    const window = returns.slice(i - windowSize + 1, i + 1);
    const stdDev = calculateStandardDeviation(window);
    volatilities.push(stdDev * Math.sqrt(periodsPerYear));
  }

  return volatilities;
}

/**
 * Calculate Correlation Matrix
 * Pairwise correlations between multiple return series
 *
 * @param returnsSeries - Object mapping names to return arrays
 * @returns 2D correlation matrix
 */
export function calculateCorrelationMatrix(
  returnsSeries: Record<string, number[]>
): Record<string, Record<string, number>> {
  const names = Object.keys(returnsSeries);
  const matrix: Record<string, Record<string, number>> = {};

  for (const name1 of names) {
    matrix[name1] = {};
    for (const name2 of names) {
      if (name1 === name2) {
        matrix[name1][name2] = 1;
      } else {
        matrix[name1][name2] = calculateCorrelation(
          returnsSeries[name1],
          returnsSeries[name2]
        );
      }
    }
  }

  return matrix;
}

/**
 * Calculate Correlation Coefficient
 * Pearson correlation between two return series
 *
 * @param returns1 - First return series
 * @param returns2 - Second return series
 * @returns Correlation coefficient (-1 to 1)
 */
export function calculateCorrelation(
  returns1: number[],
  returns2: number[]
): number {
  if (returns1.length === 0 || returns1.length !== returns2.length) {
    return 0;
  }

  const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
  const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;

  for (let i = 0; i < returns1.length; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(variance1 * variance2);
  if (denominator === 0) return 0;

  return covariance / denominator;
}

/**
 * Calculate Standard Deviation
 *
 * @param values - Array of values
 * @returns Standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Calculate Win Rate
 * Percentage of profitable trades/periods
 *
 * @param returns - Array of returns
 * @returns Win rate as percentage (0-100)
 */
export function calculateWinRate(returns: number[]): number {
  if (returns.length === 0) return 0;

  const wins = returns.filter(r => r > 0).length;
  return (wins / returns.length) * 100;
}

/**
 * Calculate Profit Factor
 * Ratio of gross profits to gross losses
 *
 * @param returns - Array of returns
 * @returns Profit factor (>1 is profitable)
 */
export function calculateProfitFactor(returns: number[]): number {
  if (returns.length === 0) return 0;

  const grossProfit = returns.filter(r => r > 0).reduce((sum, r) => sum + r, 0);
  const grossLoss = Math.abs(returns.filter(r => r < 0).reduce((sum, r) => sum + r, 0));

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;

  return grossProfit / grossLoss;
}

/**
 * Calculate Average Win and Loss
 *
 * @param returns - Array of returns
 * @returns { avgWin, avgLoss }
 */
export function calculateAvgWinLoss(returns: number[]): {
  avgWin: number;
  avgLoss: number;
} {
  if (returns.length === 0) return { avgWin: 0, avgLoss: 0 };

  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);

  const avgWin = wins.length > 0
    ? wins.reduce((sum, r) => sum + r, 0) / wins.length
    : 0;

  const avgLoss = losses.length > 0
    ? losses.reduce((sum, r) => sum + r, 0) / losses.length
    : 0;

  return { avgWin, avgLoss };
}

/**
 * Calculate Time-Weighted Return
 * Accounts for timing of cashflows
 *
 * @param portfolioValues - Array of portfolio values over time
 * @returns Total return as percentage
 */
export function calculateTimeWeightedReturn(portfolioValues: number[]): number {
  if (portfolioValues.length < 2) return 0;

  let product = 1;
  for (let i = 1; i < portfolioValues.length; i++) {
    const periodReturn = (portfolioValues[i] - portfolioValues[i - 1]) / portfolioValues[i - 1];
    product *= (1 + periodReturn);
  }

  return (product - 1) * 100; // Return as percentage
}

/**
 * Calculate Concentration Risk
 * Measures how concentrated the portfolio is (Herfindahl-Hirschman Index)
 *
 * @param allocations - Array of allocation percentages (0-1)
 * @returns HHI score (0-1, higher = more concentrated)
 */
export function calculateConcentrationRisk(allocations: number[]): number {
  if (allocations.length === 0) return 0;

  const sumSquares = allocations.reduce((sum, alloc) => sum + alloc * alloc, 0);
  return sumSquares;
}

/**
 * Calculate Liquidity Score
 * Estimates portfolio liquidity based on position sizes and trading volumes
 *
 * @param positionValues - Array of position values
 * @param tradingVolumes - Array of daily trading volumes for each position
 * @returns Liquidity score (days to liquidate)
 */
export function calculateLiquidityScore(
  positionValues: number[],
  tradingVolumes: number[]
): number {
  if (positionValues.length === 0 || positionValues.length !== tradingVolumes.length) {
    return 0;
  }

  let totalDaysToLiquidate = 0;

  for (let i = 0; i < positionValues.length; i++) {
    // Assume we can trade 10% of daily volume without major impact
    const liquidityPerDay = tradingVolumes[i] * 0.1;
    if (liquidityPerDay > 0) {
      totalDaysToLiquidate += positionValues[i] / liquidityPerDay;
    }
  }

  return totalDaysToLiquidate;
}

/**
 * Generate Performance Summary
 * Comprehensive performance metrics object
 *
 * @param returns - Array of period returns
 * @param benchmarkReturns - Optional benchmark returns
 * @returns Performance summary object
 */
export interface PerformanceSummary {
  totalReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  alpha?: number;
  beta?: number;
  var95: number;
  cvar95: number;
}

export function generatePerformanceSummary(
  returns: number[],
  benchmarkReturns?: number[],
  periodsPerYear: number = 252
): PerformanceSummary {
  const { avgWin, avgLoss } = calculateAvgWinLoss(returns);

  const summary: PerformanceSummary = {
    totalReturn: returns.reduce((sum, r) => sum + r, 0),
    sharpeRatio: calculateSharpeRatio(returns, 0.04, periodsPerYear),
    sortinoRatio: calculateSortinoRatio(returns, 0.04, periodsPerYear),
    calmarRatio: calculateCalmarRatio(returns, periodsPerYear),
    maxDrawdown: calculateMaxDrawdown(returns),
    currentDrawdown: calculateCurrentDrawdown(returns),
    volatility: calculateStandardDeviation(returns) * Math.sqrt(periodsPerYear),
    winRate: calculateWinRate(returns),
    profitFactor: calculateProfitFactor(returns),
    avgWin,
    avgLoss,
    var95: calculateVaR(returns, 0.95),
    cvar95: calculateCVaR(returns, 0.95),
  };

  if (benchmarkReturns && benchmarkReturns.length === returns.length) {
    const { alpha, beta } = calculateAlphaBeta(returns, benchmarkReturns);
    summary.alpha = alpha;
    summary.beta = beta;
  }

  return summary;
}

/**
 * Type definitions for analytics
 */
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface TradeMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalFees: number;
  avgTradeSize: number;
  avgSlippage: number;
}

export interface RiskMetrics {
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  volatility30d: number;
  concentrationRisk: number;
  liquidityScore: number;
}
