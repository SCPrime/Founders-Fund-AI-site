// Technical indicator calculations using technicalindicators library
import {
  SMA,
  EMA,
  WMA,
  RSI,
  MACD,
  BollingerBands,
  Stochastic,
  ATR,
} from 'technicalindicators';
import { CandleData, LineData, MACDData, BollingerBandsData, HistogramData } from '../types';

// Ichimoku Cloud calculation (manual implementation as it's not in technicalindicators)
export function calculateIchimoku(
  candles: CandleData[],
  tenkanPeriod = 9,
  kijunPeriod = 26,
  senkouBPeriod = 52,
  displacement = 26
) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const tenkan: LineData[] = [];
  const kijun: LineData[] = [];
  const senkouA: LineData[] = [];
  const senkouB: LineData[] = [];
  const chikou: LineData[] = [];

  for (let i = 0; i < candles.length; i++) {
    // Tenkan-sen (Conversion Line)
    if (i >= tenkanPeriod - 1) {
      const periodHigh = Math.max(...highs.slice(i - tenkanPeriod + 1, i + 1));
      const periodLow = Math.min(...lows.slice(i - tenkanPeriod + 1, i + 1));
      tenkan.push({
        time: candles[i].time,
        value: (periodHigh + periodLow) / 2
      });
    }

    // Kijun-sen (Base Line)
    if (i >= kijunPeriod - 1) {
      const periodHigh = Math.max(...highs.slice(i - kijunPeriod + 1, i + 1));
      const periodLow = Math.min(...lows.slice(i - kijunPeriod + 1, i + 1));
      kijun.push({
        time: candles[i].time,
        value: (periodHigh + periodLow) / 2
      });
    }

    // Senkou Span A (Leading Span A)
    if (i >= Math.max(tenkanPeriod, kijunPeriod) - 1 && i + displacement < candles.length) {
      const tenkanValue = tenkan[i - kijunPeriod + 1]?.value || 0;
      const kijunValue = kijun[i - kijunPeriod + 1]?.value || 0;
      senkouA.push({
        time: candles[i + displacement].time,
        value: (tenkanValue + kijunValue) / 2
      });
    }

    // Senkou Span B (Leading Span B)
    if (i >= senkouBPeriod - 1 && i + displacement < candles.length) {
      const periodHigh = Math.max(...highs.slice(i - senkouBPeriod + 1, i + 1));
      const periodLow = Math.min(...lows.slice(i - senkouBPeriod + 1, i + 1));
      senkouB.push({
        time: candles[i + displacement].time,
        value: (periodHigh + periodLow) / 2
      });
    }

    // Chikou Span (Lagging Span)
    if (i >= displacement) {
      chikou.push({
        time: candles[i - displacement].time,
        value: candles[i].close
      });
    }
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}

// Moving Averages
export function calculateSMA(candles: CandleData[], period: number): LineData[] {
  const closes = candles.map(c => c.close);
  const smaValues = SMA.calculate({ period, values: closes });

  return smaValues.map((value, index) => ({
    time: candles[index + period - 1].time,
    value
  }));
}

export function calculateEMA(candles: CandleData[], period: number): LineData[] {
  const closes = candles.map(c => c.close);
  const emaValues = EMA.calculate({ period, values: closes });

  return emaValues.map((value, index) => ({
    time: candles[index + period - 1].time,
    value
  }));
}

export function calculateWMA(candles: CandleData[], period: number): LineData[] {
  const closes = candles.map(c => c.close);
  const wmaValues = WMA.calculate({ period, values: closes });

  return wmaValues.map((value, index) => ({
    time: candles[index + period - 1].time,
    value
  }));
}

// RSI
export function calculateRSI(candles: CandleData[], period = 14): LineData[] {
  const closes = candles.map(c => c.close);
  const rsiValues = RSI.calculate({ period, values: closes });

  return rsiValues.map((value, index) => ({
    time: candles[index + period].time,
    value
  }));
}

// MACD
export function calculateMACD(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDData {
  const closes = candles.map(c => c.close);
  const macdData = MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });

  const macd: HistogramData[] = [];
  const signal: LineData[] = [];
  const histogram: HistogramData[] = [];

  macdData.forEach((data, index) => {
    const time = candles[index + slowPeriod - 1].time;

    if (data.MACD !== undefined) {
      macd.push({ time, value: data.MACD });
    }

    if (data.signal !== undefined) {
      signal.push({ time, value: data.signal });
    }

    if (data.histogram !== undefined) {
      histogram.push({
        time,
        value: data.histogram,
        color: data.histogram >= 0 ? '#26a69a' : '#ef5350'
      });
    }
  });

  return { macd, signal, histogram };
}

// Bollinger Bands
export function calculateBollingerBands(
  candles: CandleData[],
  period = 20,
  stdDev = 2
): BollingerBandsData {
  const closes = candles.map(c => c.close);
  const bbData = BollingerBands.calculate({
    period,
    values: closes,
    stdDev
  });

  const upper: LineData[] = [];
  const middle: LineData[] = [];
  const lower: LineData[] = [];

  bbData.forEach((data, index) => {
    const time = candles[index + period - 1].time;

    upper.push({ time, value: data.upper });
    middle.push({ time, value: data.middle });
    lower.push({ time, value: data.lower });
  });

  return { upper, middle, lower };
}

// Stochastic Oscillator
export function calculateStochastic(
  candles: CandleData[],
  period = 14,
  signalPeriod = 3
): { k: LineData[]; d: LineData[] } {
  const stochData = Stochastic.calculate({
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    period,
    signalPeriod
  });

  const k: LineData[] = [];
  const d: LineData[] = [];

  stochData.forEach((data, index) => {
    const time = candles[index + period - 1].time;
    k.push({ time, value: data.k });
    d.push({ time, value: data.d });
  });

  return { k, d };
}

// ATR (Average True Range)
export function calculateATR(candles: CandleData[], period = 14): LineData[] {
  const atrValues = ATR.calculate({
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    close: candles.map(c => c.close),
    period
  });

  return atrValues.map((value, index) => ({
    time: candles[index + period].time,
    value
  }));
}

// Volume Profile (simplified implementation)
export function calculateVolumeProfile(candles: CandleData[], bins = 24) {
  const priceRange = {
    min: Math.min(...candles.map(c => c.low)),
    max: Math.max(...candles.map(c => c.high))
  };

  const binSize = (priceRange.max - priceRange.min) / bins;
  const volumeProfile: Array<{ price: number; volume: number }> = [];

  // Initialize bins
  for (let i = 0; i < bins; i++) {
    volumeProfile.push({
      price: priceRange.min + (i + 0.5) * binSize,
      volume: 0
    });
  }

  // Distribute volume across price levels
  candles.forEach(candle => {
    if (!candle.volume) return;

    const binIndex = Math.floor((candle.close - priceRange.min) / binSize);
    if (binIndex >= 0 && binIndex < bins) {
      volumeProfile[binIndex].volume += candle.volume;
    }
  });

  return volumeProfile;
}

// Financial metrics calculations
export function calculateFinancialMetrics(returns: number[], riskFreeRate = 0.02) {
  if (returns.length === 0) {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
      winRate: 0,
      profitFactor: 0,
      volatility: 0,
      totalReturn: 0,
      avgWin: 0,
      avgLoss: 0
    };
  }

  // Calculate basic statistics
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  // Sharpe Ratio
  const sharpeRatio = volatility > 0 ? (mean - riskFreeRate) / volatility : 0;

  // Sortino Ratio (only downside volatility)
  const negativeReturns = returns.filter(r => r < 0);
  const downsideDeviation = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length)
    : 0;
  const sortinoRatio = downsideDeviation > 0 ? (mean - riskFreeRate) / downsideDeviation : 0;

  // Max Drawdown
  let peak = -Infinity;
  let maxDrawdown = 0;
  let cumulative = 0;

  returns.forEach(r => {
    cumulative += r;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  // Calmar Ratio
  const calmarRatio = maxDrawdown > 0 ? mean / maxDrawdown : 0;

  // Win Rate and Profit Factor
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const winRate = returns.length > 0 ? (wins.length / returns.length) * 100 : 0;

  const totalWins = wins.reduce((a, b) => a + b, 0);
  const totalLosses = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

  const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

  const totalReturn = returns.reduce((a, b) => a + b, 0);

  return {
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    calmarRatio,
    winRate,
    profitFactor,
    volatility: volatility * 100,
    totalReturn: totalReturn * 100,
    avgWin,
    avgLoss
  };
}
