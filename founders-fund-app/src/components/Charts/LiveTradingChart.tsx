'use client';

import { useLivePrice } from '@/hooks/useLivePrice';
import { useCallback, useEffect, useRef, useState } from 'react';
import DrawingTools from './DrawingTools';
import FullScreenChart from './FullScreenChart';
import IndicatorSelector from './IndicatorSelector';
import TimeFrameSelector from './TimeFrameSelector';
import { CandleData, DrawingTool, IndicatorConfig, TimeFrame } from './types';

interface LiveTradingChartProps {
  symbol: string;
  chain: string;
  address: string;
  agentId?: string;
  portfolioId?: string;
}

export default function LiveTradingChart({
  symbol,
  chain,
  address,
  agentId,
  portfolioId,
}: LiveTradingChartProps) {
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1d');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [_selectedTool, setSelectedTool] = useState<DrawingTool['type'] | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Subscribe to live price updates
  const livePrice = useLivePrice({
    symbol,
    chain,
    address,
    enabled: true,
  });

  // Track the last candle update time to decide when to create new candle
  const lastCandleTimeRef = useRef<number>(0);

  // Fetch historical chart data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(
          `/api/integrations/dexscreener/chart?chain=${chain}&address=${address}&timeframe=${timeFrame}`,
        );

        if (response.ok) {
          const data = await response.json();

          // Convert DexScreener data to CandleData format
          const candles: CandleData[] = data.map((item: any) => ({
            time: (item.timestamp / 1000) as any, // Convert to seconds
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseFloat(item.volume || 0),
          }));

          setCandleData(candles);
          if (candles.length > 0) {
            lastCandleTimeRef.current = (candles[candles.length - 1].time as number) * 1000;
          }
        } else {
          // Fallback: generate sample data if API fails
          console.warn('Failed to fetch historical data, using sample data');
          const sampleData = generateSampleData(200);
          setCandleData(sampleData);
        }
      } catch (error) {
        console.error('Error fetching historical data:', error);
        // Use sample data as fallback
        const sampleData = generateSampleData(200);
        setCandleData(sampleData);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistoricalData();
  }, [chain, address, timeFrame]);

  // Update chart with live price data
  useEffect(() => {
    if (!livePrice.price || candleData.length === 0) {
      return;
    }

    const now = Date.now();
    const currentTime = Math.floor(now / 1000);

    // Determine candle duration based on timeframe
    const candleDuration = getTimeframeDuration(timeFrame);
    const currentCandleStart = Math.floor(currentTime / candleDuration) * candleDuration;

    setCandleData((prev) => {
      const newData = [...prev];
      const lastCandle = newData[newData.length - 1];
      const lastCandleTime = lastCandle.time as number;

      // If we're in a new candle period, create a new candle
      if (currentCandleStart > lastCandleTime) {
        const newCandle: CandleData = {
          time: currentCandleStart as any,
          open: livePrice.price || 0,
          high: livePrice.price || 0,
          low: livePrice.price || 0,
          close: livePrice.price || 0,
          volume: livePrice.volume24h || 0,
        };
        newData.push(newCandle);
      } else {
        // Update current candle
        const updatedCandle: CandleData = {
          ...lastCandle,
          high: Math.max(lastCandle.high, livePrice.price || 0),
          low: Math.min(lastCandle.low, livePrice.price || 0),
          close: livePrice.price || 0,
          volume: livePrice.volume24h || lastCandle.volume,
        };
        newData[newData.length - 1] = updatedCandle;
      }

      return newData;
    });

    lastCandleTimeRef.current = now;
  }, [livePrice.price, livePrice.volume24h, timeFrame, candleData.length]);

  const handleIndicatorsChange = useCallback((newIndicators: IndicatorConfig[]) => {
    setIndicators(newIndicators);
  }, []);

  const handleToolSelect = useCallback((tool: DrawingTool['type'] | null) => {
    setSelectedTool(tool);
  }, []);

  const handleSaveDrawings = async (drawings: DrawingTool[]) => {
    try {
      const response = await fetch('/api/chart-drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          agentId,
          drawings,
        }),
      });

      if (!response.ok) throw new Error('Failed to save drawings');
    } catch (error) {
      console.error('Error saving drawings:', error);
      throw error;
    }
  };

  const handleLoadDrawings = async (): Promise<DrawingTool[]> => {
    try {
      const params = new URLSearchParams();
      if (portfolioId) params.append('portfolioId', portfolioId);
      if (agentId) params.append('agentId', agentId);

      const response = await fetch(`/api/chart-drawings?${params}`);
      if (!response.ok) throw new Error('Failed to load drawings');

      const result = await response.json();
      setDrawings(result.drawings || []);
      return result.drawings || [];
    } catch (error) {
      console.error('Error loading drawings:', error);
      throw error;
    }
  };

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} p-6`}>
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1
              className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              {symbol} Trading Chart
            </h1>
            {livePrice.isConnected && (
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Live Price: $
                  {livePrice.price?.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8,
                  })}
                </span>
                {livePrice.change24h !== null && (
                  <span
                    className={`text-sm font-medium ${livePrice.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {livePrice.change24h >= 0 ? '↑' : '↓'}{' '}
                    {Math.abs(livePrice.change24h).toFixed(2)}% 24h
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap gap-4 items-center">
          <TimeFrameSelector selected={timeFrame} onChange={setTimeFrame} />
          <IndicatorSelector
            onIndicatorsChange={handleIndicatorsChange}
            initialIndicators={indicators}
          />
          <DrawingTools
            onToolSelect={handleToolSelect}
            onSave={handleSaveDrawings}
            onLoad={handleLoadDrawings}
            onClear={handleClearDrawings}
            drawings={drawings}
          />
        </div>

        {/* Main Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 relative">
          {isLoadingHistory && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className={`mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Loading chart data...
                </p>
              </div>
            </div>
          )}
          <FullScreenChart
            data={candleData}
            theme={theme}
            height={600}
            indicators={indicators}
            drawings={drawings}
          />
        </div>

        {/* Info Panel */}
        <div
          className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Live Stats */}
            <div>
              <h3
                className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                Live Statistics
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Price:
                  </span>
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    ${livePrice.price?.toFixed(8) || 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    24h Change:
                  </span>
                  <span
                    className={
                      livePrice.change24h && livePrice.change24h >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                  >
                    {livePrice.change24h !== null ? `${livePrice.change24h.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    24h Volume:
                  </span>
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    ${livePrice.volume24h?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Liquidity:
                  </span>
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    ${livePrice.liquidity?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Indicators */}
            <div>
              <h3
                className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                Active Indicators
              </h3>
              <div className="flex flex-wrap gap-2">
                {indicators
                  .filter((i) => i.enabled)
                  .map((indicator) => (
                    <span
                      key={indicator.id}
                      className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
                    >
                      {indicator.name}
                    </span>
                  ))}
                {indicators.filter((i) => i.enabled).length === 0 && (
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    No indicators active
                  </span>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div>
              <h3
                className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                Connection Status
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${livePrice.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
                  ></span>
                  <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    {livePrice.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Last Update:{' '}
                  {livePrice.lastUpdate
                    ? new Date(livePrice.lastUpdate).toLocaleTimeString()
                    : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get timeframe duration in seconds
function getTimeframeDuration(timeframe: TimeFrame): number {
  const durations: Record<TimeFrame, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
    '1M': 2592000, // 30 days
  };
  return durations[timeframe] || 86400;
}

// Generate sample candle data for demonstration
function generateSampleData(count: number): CandleData[] {
  const data: CandleData[] = [];
  let basePrice = 50000;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 1000;
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * 500;
    const low = Math.min(open, close) - Math.random() * 500;
    const volume = Math.random() * 1000 + 500;

    data.push({
      time: ((now - (count - i) * dayMs) / 1000) as any,
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close;
  }

  return data;
}
