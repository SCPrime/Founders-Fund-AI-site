/**
 * Historical Data Generator for Backtesting
 *
 * Fetches historical OHLCV data from various price feed APIs
 * for use in backtesting strategies
 */

export interface HistoricalCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch historical data from DexScreener API
 */
export async function fetchHistoricalData(
  symbol: string,
  chain?: string,
  address?: string,
  days: number = 30,
): Promise<HistoricalCandle[]> {
  try {
    // If we have chain and address, use DexScreener
    if (chain && address) {
      const limit = Math.min(days, 365); // Max 365 days
      const response = await fetch(
        `/api/integrations/dexscreener/chart?chain=${chain}&address=${address}&timeframe=1d&limit=${limit}`,
      );

      if (response.ok) {
        const chartData = await response.json();
        return chartData.map((candle: any) => ({
          timestamp: candle.timestamp || Date.now(),
          open: parseFloat(candle.open || 0),
          high: parseFloat(candle.high || 0),
          low: parseFloat(candle.low || 0),
          close: parseFloat(candle.close || 0),
          volume: parseFloat(candle.volume || 0),
        }));
      }
    }

    // Fallback: Generate sample data based on symbol
    // In production, this would fetch from Coinbase or other APIs
    return generateSampleData(symbol, days);
  } catch (error) {
    console.warn('Failed to fetch historical data, using sample data:', error);
    return generateSampleData(symbol, days);
  }
}

/**
 * Generate sample historical data for backtesting
 * This is a fallback when real data isn't available
 */
function generateSampleData(symbol: string, days: number): HistoricalCandle[] {
  const candles: HistoricalCandle[] = [];
  const basePrice = getBasePriceForSymbol(symbol);
  let currentPrice = basePrice;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - i * dayMs;

    // Simulate price movement with random walk
    const change = (Math.random() - 0.5) * 0.05; // ±5% daily volatility
    currentPrice = currentPrice * (1 + change);

    const open = currentPrice;
    const volatility = currentPrice * 0.02; // 2% intraday volatility
    const high = open + Math.random() * volatility;
    const low = open - Math.random() * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const volume = Math.random() * 1000000; // Random volume

    candles.push({
      timestamp,
      open,
      high: Math.max(open, high, close),
      low: Math.min(open, low, close),
      close,
      volume,
    });
  }

  return candles;
}

/**
 * Get base price for a symbol (for sample data generation)
 */
function getBasePriceForSymbol(symbol: string): number {
  const priceMap: Record<string, number> = {
    PEPE: 0.00001,
    BTC: 45000,
    ETH: 2500,
    SOL: 100,
    DOGE: 0.1,
  };
  return priceMap[symbol.toUpperCase()] || 1.0;
}
