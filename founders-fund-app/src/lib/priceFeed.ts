/**
 * Unified Price Feed Service
 *
 * Provides a unified interface for fetching crypto prices from multiple sources
 * with fallback mechanisms and caching.
 *
 * Priority order:
 * 1. DexScreener (DEX data - most accurate for new tokens)
 * 2. DEXTools (DEX data with additional metrics)
 * 3. Coinbase (CEX data - reliable fallback for major tokens)
 */

interface PriceData {
  price: number;
  source: 'dexscreener' | 'dextools' | 'coinbase';
  timestamp: number;
  symbol: string;
  chain?: string;
  volume24h?: number;
  liquidity?: number;
  priceChange24h?: number;
}

interface CacheEntry {
  data: PriceData;
  timestamp: number;
}

interface TokenConfig {
  symbol: string;
  chain?: string;
  address?: string;
  coinbasePair?: string; // e.g., 'BTC-USD'
}

export class UnifiedPriceFeed {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds in milliseconds
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Get price for a token with automatic fallback
   */
  async getPrice(token: TokenConfig): Promise<PriceData | null> {
    const cacheKey = this.getCacheKey(token);

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Try each source in order
    let priceData: PriceData | null = null;

    // 1. Try DexScreener first (best for DEX tokens)
    if (token.chain && token.address) {
      priceData = await this.fetchFromDexScreener(token);
      if (priceData) {
        this.setCache(cacheKey, priceData);
        return priceData;
      }
    }

    // 2. Try DEXTools (alternative DEX source)
    if (token.chain && token.address) {
      priceData = await this.fetchFromDexTools(token);
      if (priceData) {
        this.setCache(cacheKey, priceData);
        return priceData;
      }
    }

    // 3. Try Coinbase (fallback for major tokens)
    if (token.coinbasePair) {
      priceData = await this.fetchFromCoinbase(token);
      if (priceData) {
        this.setCache(cacheKey, priceData);
        return priceData;
      }
    }

    console.warn(`Unable to fetch price for token: ${token.symbol}`);
    return null;
  }

  /**
   * Get prices for multiple tokens in parallel
   */
  async getPrices(tokens: TokenConfig[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    const promises = tokens.map(async (token) => {
      const price = await this.getPrice(token);
      if (price) {
        results.set(token.symbol, price);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Fetch price from DexScreener
   */
  private async fetchFromDexScreener(token: TokenConfig): Promise<PriceData | null> {
    try {
      const url = `/api/integrations/dexscreener/price?chain=${token.chain}&address=${token.address}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`DexScreener failed for ${token.symbol}:`, response.statusText);
        return null;
      }

      const data = await response.json();

      return {
        price: data.price,
        source: 'dexscreener',
        timestamp: Date.now(),
        symbol: token.symbol,
        chain: token.chain,
        volume24h: data.volume24h,
        liquidity: data.liquidity,
        priceChange24h: data.priceChange24h,
      };
    } catch (error) {
      console.warn(`DexScreener error for ${token.symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Fetch price from DEXTools
   */
  private async fetchFromDexTools(token: TokenConfig): Promise<PriceData | null> {
    try {
      const url = `/api/integrations/dextools/token-info?chain=${token.chain}&address=${token.address}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`DEXTools failed for ${token.symbol}:`, response.statusText);
        return null;
      }

      const data = await response.json();

      // DEXTools token-info doesn't include price directly, need to get from pair
      // We'll need to make another call to get price from the representative pair
      if (data.reprPair) {
        // This is a simplified version - in production, you'd fetch the pair price
        console.warn(`DEXTools for ${token.symbol}: would need additional pair price fetch`);
      }

      return null; // For now, we don't have direct price from token-info
    } catch (error) {
      console.warn(`DEXTools error for ${token.symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Fetch price from Coinbase
   */
  private async fetchFromCoinbase(token: TokenConfig): Promise<PriceData | null> {
    try {
      const url = `/api/integrations/coinbase/prices?currency=${token.coinbasePair}&type=spot`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Coinbase failed for ${token.symbol}:`, response.statusText);
        return null;
      }

      const data = await response.json();

      return {
        price: data.price,
        source: 'coinbase',
        timestamp: Date.now(),
        symbol: token.symbol,
      };
    } catch (error) {
      console.warn(`Coinbase error for ${token.symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Generate cache key for a token
   */
  private getCacheKey(token: TokenConfig): string {
    return `${token.symbol}_${token.chain || ''}_${token.address || ''}`;
  }

  /**
   * Get price from cache if not expired
   */
  private getFromCache(key: string): PriceData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set price in cache
   */
  private setCache(key: string, data: PriceData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance for use across the application
let priceFeedInstance: UnifiedPriceFeed | null = null;

export function getPriceFeed(): UnifiedPriceFeed {
  if (!priceFeedInstance) {
    priceFeedInstance = new UnifiedPriceFeed();

    // Setup periodic cache cleanup (every 5 minutes)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        priceFeedInstance?.cleanupCache();
      }, 5 * 60 * 1000);
    }
  }
  return priceFeedInstance;
}

// Export types
export type { PriceData, TokenConfig };
