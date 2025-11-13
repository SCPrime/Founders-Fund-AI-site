/**
 * useLivePrice Hook
 *
 * Custom React hook for subscribing to real-time price updates
 * Automatically handles connection/disconnection and provides current price state
 */

import { useState, useEffect, useRef } from 'react';
import { getClientPriceFeed, PriceUpdate, TokenSubscription } from '@/lib/websocket/clientPriceFeed';

export interface LivePriceState {
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  lastUpdate: number | null;
}

export interface UseLivePriceOptions {
  symbol: string;
  chain: string;
  address: string;
  enabled?: boolean; // Allow disabling the subscription
  refreshInterval?: number; // Manual refresh interval in ms (default: use WebSocket polling)
}

export function useLivePrice(options: UseLivePriceOptions): LivePriceState {
  const { symbol, chain, address, enabled = true, refreshInterval } = options;

  const [state, setState] = useState<LivePriceState>({
    price: null,
    change24h: null,
    volume24h: null,
    liquidity: null,
    isConnected: false,
    isLoading: true,
    error: null,
    lastUpdate: null,
  });

  const priceFeedRef = useRef(getClientPriceFeed());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const priceFeed = priceFeedRef.current;
    const token: TokenSubscription = { symbol, chain, address };

    // Handler for price updates
    const handlePriceUpdate = (update: PriceUpdate) => {
      setState({
        price: update.price,
        change24h: update.change24h,
        volume24h: update.volume24h,
        liquidity: update.liquidity,
        isConnected: true,
        isLoading: false,
        error: null,
        lastUpdate: update.timestamp,
      });
    };

    // Handler for errors
    const handleError = (error: { symbol: string; error: any }) => {
      if (error.symbol === symbol) {
        setState(prev => ({
          ...prev,
          error: error.error,
          isConnected: false,
          isLoading: false,
        }));
      }
    };

    // Subscribe to price updates
    priceFeed.subscribe(token);
    priceFeed.on(`price:${symbol}`, handlePriceUpdate);
    priceFeed.on('error', handleError);

    // Check if we already have a cached price
    const cachedPrice = priceFeed.getLastPrice(symbol);
    if (cachedPrice) {
      handlePriceUpdate(cachedPrice);
    }

    // Set up manual refresh interval if specified
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        priceFeed.refreshPrices();
      }, refreshInterval);
    }

    // Cleanup on unmount
    return () => {
      priceFeed.off(`price:${symbol}`, handlePriceUpdate);
      priceFeed.off('error', handleError);
      priceFeed.unsubscribe(token);

      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [symbol, chain, address, enabled, refreshInterval]);

  return state;
}

/**
 * Hook for subscribing to multiple token prices at once
 */
export function useMultipleLivePrices(tokens: UseLivePriceOptions[]): Map<string, LivePriceState> {
  const [pricesMap, setPricesMap] = useState<Map<string, LivePriceState>>(new Map());
  const priceFeedRef = useRef(getClientPriceFeed());

  useEffect(() => {
    const priceFeed = priceFeedRef.current;
    const handlers = new Map<string, (update: PriceUpdate) => void>();

    // Subscribe to all tokens
    tokens.forEach(token => {
      if (token.enabled === false) {
        return;
      }

      const subscription: TokenSubscription = {
        symbol: token.symbol,
        chain: token.chain,
        address: token.address,
      };

      const handler = (update: PriceUpdate) => {
        setPricesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(token.symbol, {
            price: update.price,
            change24h: update.change24h,
            volume24h: update.volume24h,
            liquidity: update.liquidity,
            isConnected: true,
            isLoading: false,
            error: null,
            lastUpdate: update.timestamp,
          });
          return newMap;
        });
      };

      handlers.set(token.symbol, handler);
      priceFeed.subscribe(subscription);
      priceFeed.on(`price:${token.symbol}`, handler);

      // Check for cached price
      const cachedPrice = priceFeed.getLastPrice(token.symbol);
      if (cachedPrice) {
        handler(cachedPrice);
      } else {
        // Set initial loading state
        setPricesMap(prev => {
          const newMap = new Map(prev);
          newMap.set(token.symbol, {
            price: null,
            change24h: null,
            volume24h: null,
            liquidity: null,
            isConnected: false,
            isLoading: true,
            error: null,
            lastUpdate: null,
          });
          return newMap;
        });
      }
    });

    // Cleanup
    return () => {
      tokens.forEach(token => {
        const handler = handlers.get(token.symbol);
        if (handler) {
          priceFeed.off(`price:${token.symbol}`, handler);
          priceFeed.unsubscribe({
            symbol: token.symbol,
            chain: token.chain,
            address: token.address,
          });
        }
      });
    };
  }, [tokens]);

  return pricesMap;
}

/**
 * Hook for getting price with manual refresh control
 */
export function usePriceWithRefresh(options: UseLivePriceOptions) {
  const priceState = useLivePrice(options);
  const priceFeedRef = useRef(getClientPriceFeed());

  const refresh = async () => {
    await priceFeedRef.current.refreshPrices();
  };

  return {
    ...priceState,
    refresh,
  };
}
