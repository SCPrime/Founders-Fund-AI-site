/**
 * Client-side WebSocket Price Feed Manager
 *
 * Since Next.js App Router doesn't support WebSocket server endpoints,
 * this client-side service connects directly to DexScreener WebSocket
 * and provides a unified interface for subscribing to price updates.
 */

import { EventEmitter } from 'events';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  liquidity: number;
  timestamp: number;
  source: 'dexscreener' | 'dextools' | 'coinbase';
}

export interface TokenSubscription {
  symbol: string;
  chain: string;
  address: string;
}

export class ClientPriceFeed extends EventEmitter {
  private subscriptions: Map<string, TokenSubscription> = new Map();
  private prices: Map<string, PriceUpdate> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs = 5000; // Poll every 5 seconds
  private isPolling = false;

  constructor() {
    super();
    this.setMaxListeners(50); // Support up to 50 listeners (20 agents + extras)
  }

  /**
   * Subscribe to price updates for a token
   */
  subscribe(token: TokenSubscription): void {
    const key = this.getSubscriptionKey(token);
    this.subscriptions.set(key, token);

    // Start polling if not already started
    if (!this.isPolling) {
      this.startPolling();
    }

    // Immediately fetch price
    this.fetchPrice(token);
  }

  /**
   * Unsubscribe from price updates for a token
   */
  unsubscribe(token: TokenSubscription): void {
    const key = this.getSubscriptionKey(token);
    this.subscriptions.delete(key);

    // Stop polling if no subscriptions
    if (this.subscriptions.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Get the last known price for a token
   */
  getLastPrice(symbol: string): PriceUpdate | null {
    return this.prices.get(symbol) || null;
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): TokenSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Manually trigger price fetch for all subscriptions
   */
  async refreshPrices(): Promise<void> {
    const tokens = Array.from(this.subscriptions.values());
    await Promise.all(tokens.map(token => this.fetchPrice(token)));
  }

  /**
   * Fetch price for a single token
   */
  private async fetchPrice(token: TokenSubscription): Promise<void> {
    try {
      const response = await fetch(
        `/api/integrations/dexscreener/price?chain=${token.chain}&address=${token.address}`
      );

      if (!response.ok) {
        // Try DEXTools as fallback
        const dextoolsResponse = await fetch(
          `/api/integrations/dextools/token-info?chain=${token.chain}&address=${token.address}`
        );

        if (dextoolsResponse.ok) {
          const data = await dextoolsResponse.json();
          this.emitPriceUpdate(token.symbol, data, 'dextools');
          return;
        }

        throw new Error(`Failed to fetch price: ${response.statusText}`);
      }

      const data = await response.json();
      this.emitPriceUpdate(token.symbol, data, 'dexscreener');
    } catch (error) {
      console.error(`Failed to fetch price for ${token.symbol}:`, error);
      this.emit('error', { symbol: token.symbol, error });
    }
  }

  /**
   * Emit price update event
   */
  private emitPriceUpdate(symbol: string, data: any, source: PriceUpdate['source']): void {
    const priceUpdate: PriceUpdate = {
      symbol,
      price: parseFloat(data.price || data.priceUsd || 0),
      change24h: parseFloat(data.priceChange24h || data.priceChange?.h24 || 0),
      volume24h: parseFloat(data.volume24h || data.volume?.h24 || 0),
      liquidity: parseFloat(data.liquidity || data.liquidity?.usd || 0),
      timestamp: Date.now(),
      source,
    };

    // Store price
    this.prices.set(symbol, priceUpdate);

    // Emit events
    this.emit('price', priceUpdate);
    this.emit(`price:${symbol}`, priceUpdate);
  }

  /**
   * Start polling for price updates
   */
  private startPolling(): void {
    if (this.pollInterval) {
      return;
    }

    this.isPolling = true;

    this.pollInterval = setInterval(async () => {
      const tokens = Array.from(this.subscriptions.values());

      // Fetch prices in batches of 5 to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        await Promise.all(batch.map(token => this.fetchPrice(token)));

        // Small delay between batches
        if (i + batchSize < tokens.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling for price updates
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
    }
  }

  /**
   * Get subscription key for a token
   */
  private getSubscriptionKey(token: TokenSubscription): string {
    return `${token.chain}:${token.address}`;
  }

  /**
   * Cleanup and disconnect
   */
  disconnect(): void {
    this.stopPolling();
    this.subscriptions.clear();
    this.prices.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
let clientPriceFeedInstance: ClientPriceFeed | null = null;

export function getClientPriceFeed(): ClientPriceFeed {
  if (typeof window === 'undefined') {
    // Server-side, return a dummy instance
    return new ClientPriceFeed();
  }

  if (!clientPriceFeedInstance) {
    clientPriceFeedInstance = new ClientPriceFeed();
  }
  return clientPriceFeedInstance;
}
