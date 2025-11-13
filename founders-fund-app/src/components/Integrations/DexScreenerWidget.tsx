'use client';

import { useEffect, useState } from 'react';

interface DexScreenerWidgetProps {
  chain: string;
  address: string;
  theme?: 'light' | 'dark';
  height?: number;
}

interface ChartData {
  pairAddress: string;
  baseToken: {
    symbol: string;
    name: string;
  };
  priceUsd: number;
  volume: {
    h24: number;
    h6: number;
    h1: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
  };
  liquidity: {
    usd: number;
  };
  dexId: string;
  url: string;
}

/**
 * DexScreener Widget - Embedded chart and data display
 *
 * @param chain - Blockchain network (e.g., 'ethereum', 'solana')
 * @param address - Token contract address
 * @param theme - Display theme (light or dark)
 * @param height - Height in pixels
 */
export default function DexScreenerWidget({
  chain,
  address,
  theme = 'dark',
  height = 500,
}: DexScreenerWidgetProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChartData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/integrations/dexscreener/chart?chain=${chain}&address=${address}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch chart data: ${response.statusText}`);
        }

        const data = await response.json();
        setChartData(data);
      } catch (err) {
        console.error('DexScreener widget error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (chain && address) {
      fetchChartData();

      // Refresh every 30 seconds
      const interval = setInterval(fetchChartData, 30000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [chain, address]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center border border-gray-700 rounded-lg"
        style={{ height: `${height}px` }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center border border-red-700 rounded-lg bg-red-900/20 p-4"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-2">Error loading chart</p>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div
        className="flex items-center justify-center border border-gray-700 rounded-lg"
        style={{ height: `${height}px` }}
      >
        <p className="text-gray-400">No chart data available</p>
      </div>
    );
  }

  const priceChangeColor = chartData.priceChange.h24 >= 0 ? 'text-green-400' : 'text-red-400';
  const priceChangeSign = chartData.priceChange.h24 >= 0 ? '+' : '';

  return (
    <div
      className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}
      style={{ height: `${height}px` }}
    >
      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3
              className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              {chartData.baseToken.symbol} / {chartData.baseToken.name}
            </h3>
            <p className="text-sm text-gray-400">{chartData.dexId}</p>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              ${chartData.priceUsd.toFixed(chartData.priceUsd < 1 ? 6 : 2)}
            </p>
            <p className={`text-sm font-semibold ${priceChangeColor}`}>
              {priceChangeSign}
              {chartData.priceChange.h24.toFixed(2)}% (24h)
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">24h Volume</p>
          <p
            className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            ${chartData.volume.h24.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Liquidity</p>
          <p
            className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            ${chartData.liquidity.usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">6h Change</p>
          <p
            className={`text-sm font-semibold ${chartData.priceChange.h6 >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {chartData.priceChange.h6 >= 0 ? '+' : ''}
            {chartData.priceChange.h6.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">1h Change</p>
          <p
            className={`text-sm font-semibold ${chartData.priceChange.h1 >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {chartData.priceChange.h1 >= 0 ? '+' : ''}
            {chartData.priceChange.h1.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Chart iframe - DexScreener provides embeddable charts */}
      <div className="flex-1 p-4">
        {chartData.url && (
          <a
            href={chartData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            View Full Chart on DexScreener
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
