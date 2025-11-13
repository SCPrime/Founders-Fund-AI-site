'use client';

import { useEffect, useState, useCallback } from 'react';
import { getPriceFeed, type PriceData, type TokenConfig } from '@/lib/priceFeed';

interface PriceDisplayProps {
  token: TokenConfig;
  showDetails?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

/**
 * Real-time Price Display Component
 *
 * Displays current price for a token with automatic updates
 *
 * @param token - Token configuration
 * @param showDetails - Show additional price details
 * @param theme - Display theme
 * @param className - Additional CSS classes
 */
export default function PriceDisplay({
  token,
  showDetails = false,
  theme = 'dark',
  className = '',
}: PriceDisplayProps) {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setError(null);
      const priceFeed = getPriceFeed();
      const price = await priceFeed.getPrice(token);

      if (price) {
        setPriceData(price);
        setLastUpdate(new Date());
      } else {
        setError('Price not available');
      }
    } catch (err) {
      console.error('Price fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPrice();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  if (loading && !priceData) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="animate-pulse flex items-center space-x-2">
          <div className={`h-4 w-16 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </div>
      </div>
    );
  }

  if (error && !priceData) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <span className="text-red-500 text-sm">Price unavailable</span>
      </div>
    );
  }

  if (!priceData) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <span className="text-gray-500 text-sm">--</span>
      </div>
    );
  }

  const priceChangeColor = priceData.priceChange24h
    ? priceData.priceChange24h >= 0
      ? 'text-green-400'
      : 'text-red-400'
    : 'text-gray-400';

  const sourceColor = {
    dexscreener: 'text-blue-500',
    dextools: 'text-purple-500',
    coinbase: 'text-orange-500',
  }[priceData.source];

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center space-x-2">
        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          ${priceData.price.toFixed(priceData.price < 1 ? 6 : 2)}
        </span>
        {priceData.priceChange24h !== undefined && (
          <span className={`text-sm font-semibold ${priceChangeColor}`}>
            {priceData.priceChange24h >= 0 ? '+' : ''}
            {priceData.priceChange24h.toFixed(2)}%
          </span>
        )}
      </div>

      {showDetails && (
        <div className="flex items-center space-x-3 mt-1 text-xs">
          {priceData.volume24h && (
            <span className="text-gray-400">
              Vol: ${priceData.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          )}
          {priceData.liquidity && (
            <span className="text-gray-400">
              Liq: ${priceData.liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          )}
          <span className={`${sourceColor} font-mono`}>
            {priceData.source.toUpperCase()}
          </span>
        </div>
      )}

      {lastUpdate && (
        <div className="text-xs text-gray-500 mt-1">
          Updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
