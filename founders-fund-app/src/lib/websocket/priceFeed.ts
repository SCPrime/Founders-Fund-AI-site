/**
 * Real-time Price Feed WebSocket Service
 *
 * Manages WebSocket connections to DexScreener for live price updates
 * Supports 20+ simultaneous token subscriptions with automatic reconnection
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

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'price' | 'error' | 'ping' | 'pong';
  data?: any;
}

export class PriceFeedWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, TokenSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 60000; // Max 60 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isIntentionallyClosed = false;
  private lastPrices: Map<string, PriceUpdate> = new Map();

  // Poll interval for fallback when WebSocket is not available
  private pollInterval: NodeJS.Timeout | null = null;
  private pollIntervalMs = 5000; // Poll every 5 seconds

  constructor(private wsUrl: string = 'wss://io.dexscreener.com/dex/screener/pairs/updates') {
    super();
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearTimers();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.emit('disconnected');
  }

  /**
   * Subscribe to price updates for a token
   */
  subscribe(token: TokenSubscription): void {
    const key = this.getSubscriptionKey(token);
    this.subscriptions.set(key, token);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(token);
    }

    // Start polling as fallback
    this.startPolling();
  }

  /**
   * Unsubscribe from price updates for a token
   */
  unsubscribe(token: TokenSubscription): void {
    const key = this.getSubscriptionKey(token);
    this.subscriptions.delete(key);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendUnsubscription(token);
    }

    // Stop polling if no subscriptions
    if (this.subscriptions.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Get the last known price for a token
   */
  getLastPrice(symbol: string): PriceUpdate | null {
    return this.lastPrices.get(symbol) || null;
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): TokenSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected to price feed');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Resubscribe to all tokens
    this.subscriptions.forEach(token => {
      this.sendSubscription(token);
    });

    // Start heartbeat
    this.startHeartbeat();

    this.emit('connected');
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'price':
          this.handlePriceUpdate(message.data);
          break;
        case 'error':
          console.error('WebSocket error message:', message.data);
          this.emit('error', message.data);
          break;
        case 'pong':
          // Heartbeat response received
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.emit('error', event);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnecting = false;
    this.clearTimers();

    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }

    this.emit('disconnected');
  }

  /**
   * Handle price update from WebSocket
   */
  private handlePriceUpdate(data: any): void {
    try {
      const priceUpdate: PriceUpdate = {
        symbol: data.symbol,
        price: parseFloat(data.priceUsd || data.price),
        change24h: parseFloat(data.priceChange?.h24 || data.change24h || 0),
        volume24h: parseFloat(data.volume?.h24 || data.volume24h || 0),
        liquidity: parseFloat(data.liquidity?.usd || data.liquidity || 0),
        timestamp: Date.now(),
        source: 'dexscreener',
      };

      // Store last price
      this.lastPrices.set(priceUpdate.symbol, priceUpdate);

      // Emit price update
      this.emit('price', priceUpdate);
      this.emit(`price:${priceUpdate.symbol}`, priceUpdate);
    } catch (error) {
      console.error('Failed to process price update:', error);
    }
  }

  /**
   * Send subscription message
   */
  private sendSubscription(token: TokenSubscription): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'subscribe',
      data: {
        chain: token.chain,
        address: token.address,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send unsubscription message
   */
  private sendUnsubscription(token: TokenSubscription): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'unsubscribe',
      data: {
        chain: token.chain,
        address: token.address,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed || this.reconnectTimeout) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = { type: 'ping' };
        this.ws.send(JSON.stringify(message));
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopPolling();
  }

  /**
   * Get subscription key for a token
   */
  private getSubscriptionKey(token: TokenSubscription): string {
    return `${token.chain}:${token.address}`;
  }

  /**
   * Start polling as fallback mechanism
   */
  private startPolling(): void {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(async () => {
      // Poll prices for all subscriptions via HTTP API
      const tokens = Array.from(this.subscriptions.values());

      for (const token of tokens) {
        try {
          const response = await fetch(
            `/api/integrations/dexscreener/price?chain=${token.chain}&address=${token.address}`
          );

          if (response.ok) {
            const data = await response.json();

            const priceUpdate: PriceUpdate = {
              symbol: token.symbol,
              price: data.price,
              change24h: data.priceChange24h || 0,
              volume24h: data.volume24h || 0,
              liquidity: data.liquidity || 0,
              timestamp: Date.now(),
              source: 'dexscreener',
            };

            // Store and emit if price changed
            const lastPrice = this.lastPrices.get(token.symbol);
            if (!lastPrice || lastPrice.price !== priceUpdate.price) {
              this.lastPrices.set(token.symbol, priceUpdate);
              this.emit('price', priceUpdate);
              this.emit(`price:${token.symbol}`, priceUpdate);
            }
          }
        } catch (error) {
          console.error(`Failed to poll price for ${token.symbol}:`, error);
        }
      }
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

// Singleton instance
let priceFeedInstance: PriceFeedWebSocket | null = null;

export function getPriceFeedWebSocket(wsUrl?: string): PriceFeedWebSocket {
  if (!priceFeedInstance) {
    priceFeedInstance = new PriceFeedWebSocket(wsUrl);
  }
  return priceFeedInstance;
}
