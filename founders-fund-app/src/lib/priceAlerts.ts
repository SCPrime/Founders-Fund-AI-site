/**
 * Price Alert System
 *
 * Monitors token prices and triggers alerts when conditions are met
 * Integrates with Phase 9A notification system (email, SMS, push)
 */

import { EventEmitter } from 'events';
import { prisma } from './db';
import { getClientPriceFeed, PriceUpdate } from './websocket/clientPriceFeed';

export type AlertCondition =
  | 'ABOVE' // Price goes above threshold
  | 'BELOW' // Price goes below threshold
  | 'CHANGE_UP' // Price increases by percentage
  | 'CHANGE_DOWN'; // Price decreases by percentage

export interface PriceAlert {
  id?: string;
  userId: string;
  portfolioId?: string;
  agentId?: string;
  symbol: string;
  chain: string;
  address: string;
  condition: AlertCondition;
  threshold: number; // Price level or percentage change
  currentPrice?: number;
  isActive: boolean;
  createdAt?: Date;
  triggeredAt?: Date;
  message?: string;
}

export interface AlertTriggerEvent {
  alert: PriceAlert;
  price: PriceUpdate;
  triggeredAt: Date;
}

export class PriceAlertManager extends EventEmitter {
  private alerts: Map<string, PriceAlert> = new Map();
  private priceFeed = getClientPriceFeed();
  private priceHistory: Map<string, number[]> = new Map(); // Track price history for percentage changes

  constructor() {
    super();
    this.setupPriceListener();
  }

  /**
   * Create a new price alert
   */
  async createAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): Promise<PriceAlert> {
    try {
      // Save to database
      const dbAlert = await prisma.priceAlert.create({
        data: {
          userId: alert.userId,
          portfolioId: alert.portfolioId,
          agentId: alert.agentId,
          symbol: alert.symbol,
          chain: alert.chain,
          address: alert.address,
          condition: alert.condition,
          threshold: alert.threshold,
          isActive: alert.isActive,
          message: alert.message,
        },
      });

      const newAlert: PriceAlert = {
        id: dbAlert.id,
        userId: dbAlert.userId,
        portfolioId: dbAlert.portfolioId || undefined,
        agentId: dbAlert.agentId || undefined,
        symbol: dbAlert.symbol,
        chain: dbAlert.chain,
        address: dbAlert.address,
        condition: dbAlert.condition as AlertCondition,
        threshold: Number(dbAlert.threshold),
        isActive: dbAlert.isActive,
        createdAt: dbAlert.createdAt,
        message: dbAlert.message || undefined,
      };

      // Add to memory
      this.alerts.set(newAlert.id!, newAlert);

      // Subscribe to price feed if active
      if (newAlert.isActive) {
        this.priceFeed.subscribe({
          symbol: newAlert.symbol,
          chain: newAlert.chain,
          address: newAlert.address,
        });
      }

      this.emit('alertCreated', newAlert);
      return newAlert;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw error;
    }
  }

  /**
   * Update an existing alert
   */
  async updateAlert(id: string, updates: Partial<PriceAlert>): Promise<PriceAlert | null> {
    try {
      const dbAlert = await prisma.priceAlert.update({
        where: { id },
        data: {
          condition: updates.condition,
          threshold: updates.threshold,
          isActive: updates.isActive,
          message: updates.message,
        },
      });

      const updatedAlert: PriceAlert = {
        id: dbAlert.id,
        userId: dbAlert.userId,
        portfolioId: dbAlert.portfolioId || undefined,
        agentId: dbAlert.agentId || undefined,
        symbol: dbAlert.symbol,
        chain: dbAlert.chain,
        address: dbAlert.address,
        condition: dbAlert.condition as AlertCondition,
        threshold: Number(dbAlert.threshold),
        isActive: dbAlert.isActive,
        createdAt: dbAlert.createdAt,
        triggeredAt: dbAlert.triggeredAt || undefined,
        message: dbAlert.message || undefined,
      };

      this.alerts.set(id, updatedAlert);
      this.emit('alertUpdated', updatedAlert);
      return updatedAlert;
    } catch (error) {
      console.error('Failed to update alert:', error);
      return null;
    }
  }

  /**
   * Delete an alert
   */
  async deleteAlert(id: string): Promise<boolean> {
    try {
      await prisma.priceAlert.delete({
        where: { id },
      });

      const alert = this.alerts.get(id);
      this.alerts.delete(id);

      if (alert) {
        this.emit('alertDeleted', alert);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete alert:', error);
      return false;
    }
  }

  /**
   * Get all alerts for a user
   */
  async getAlerts(
    userId: string,
    options?: {
      portfolioId?: string;
      agentId?: string;
      activeOnly?: boolean;
    },
  ): Promise<PriceAlert[]> {
    try {
      const where: any = { userId };
      if (options?.portfolioId) where.portfolioId = options.portfolioId;
      if (options?.agentId) where.agentId = options.agentId;
      if (options?.activeOnly) where.isActive = true;

      const dbAlerts = await prisma.priceAlert.findMany({ where });

      return dbAlerts.map((dbAlert) => ({
        id: dbAlert.id,
        userId: dbAlert.userId,
        portfolioId: dbAlert.portfolioId || undefined,
        agentId: dbAlert.agentId || undefined,
        symbol: dbAlert.symbol,
        chain: dbAlert.chain,
        address: dbAlert.address,
        condition: dbAlert.condition as AlertCondition,
        threshold: Number(dbAlert.threshold),
        isActive: dbAlert.isActive,
        createdAt: dbAlert.createdAt,
        triggeredAt: dbAlert.triggeredAt || undefined,
        message: dbAlert.message || undefined,
      }));
    } catch (error) {
      console.error('Failed to get alerts:', error);
      return [];
    }
  }

  /**
   * Load alerts from database
   */
  async loadAlerts(userId: string): Promise<void> {
    const alerts = await this.getAlerts(userId, { activeOnly: true });

    alerts.forEach((alert) => {
      this.alerts.set(alert.id!, alert);

      // Subscribe to price feed
      this.priceFeed.subscribe({
        symbol: alert.symbol,
        chain: alert.chain,
        address: alert.address,
      });
    });

    this.emit('alertsLoaded', alerts.length);
  }

  /**
   * Check if a price update triggers any alerts
   */
  private checkAlerts(priceUpdate: PriceUpdate): void {
    const triggeredAlerts: AlertTriggerEvent[] = [];

    for (const [id, alert] of this.alerts.entries()) {
      if (!alert.isActive || alert.symbol !== priceUpdate.symbol) {
        continue;
      }

      let shouldTrigger = false;

      switch (alert.condition) {
        case 'ABOVE':
          shouldTrigger = priceUpdate.price > alert.threshold;
          break;

        case 'BELOW':
          shouldTrigger = priceUpdate.price < alert.threshold;
          break;

        case 'CHANGE_UP':
          shouldTrigger = this.checkPercentageChange(
            alert.symbol,
            priceUpdate.price,
            alert.threshold,
            'up',
          );
          break;

        case 'CHANGE_DOWN':
          shouldTrigger = this.checkPercentageChange(
            alert.symbol,
            priceUpdate.price,
            alert.threshold,
            'down',
          );
          break;
      }

      if (shouldTrigger) {
        const event: AlertTriggerEvent = {
          alert,
          price: priceUpdate,
          triggeredAt: new Date(),
        };

        triggeredAlerts.push(event);

        // Mark alert as triggered and deactivate
        this.updateAlert(id, {
          isActive: false,
        }).then(async () => {
          // Update triggered timestamp in database
          await prisma.priceAlert.update({
            where: { id },
            data: { triggeredAt: event.triggeredAt },
          });
        });
      }
    }

    // Emit triggered alerts
    triggeredAlerts.forEach((event) => {
      this.emit('alertTriggered', event);

      // Send notification if configured
      if (typeof window === 'undefined') {
        // Server-side: send notification via API
        this.sendNotificationForAlert(event).catch((err) => {
          console.error('Failed to send notification for alert:', err);
        });
      }
    });

    // Update price history
    this.updatePriceHistory(priceUpdate.symbol, priceUpdate.price);
  }

  /**
   * Check percentage change from initial price
   */
  private checkPercentageChange(
    symbol: string,
    currentPrice: number,
    threshold: number,
    direction: 'up' | 'down',
  ): boolean {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length === 0) {
      return false;
    }

    const initialPrice = history[0];
    const changePercent = ((currentPrice - initialPrice) / initialPrice) * 100;

    if (direction === 'up') {
      return changePercent >= threshold;
    } else {
      return changePercent <= -threshold;
    }
  }

  /**
   * Update price history for percentage change tracking
   */
  private updatePriceHistory(symbol: string, price: number): void {
    const history = this.priceHistory.get(symbol) || [];
    history.push(price);

    // Keep only last 100 prices
    if (history.length > 100) {
      history.shift();
    }

    this.priceHistory.set(symbol, history);
  }

  /**
   * Setup price listener
   */
  private setupPriceListener(): void {
    this.priceFeed.on('price', (priceUpdate: PriceUpdate) => {
      this.checkAlerts(priceUpdate);
    });
  }

  /**
   * Send notification for triggered alert
   */
  private async sendNotificationForAlert(event: AlertTriggerEvent): Promise<void> {
    try {
      // Import notification service dynamically to avoid circular dependencies
      const { getNotificationService } = await import('./notifications');

      const notificationService = getNotificationService({
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      });

      await notificationService.sendPriceAlertNotification({
        type: 'price_alert',
        symbol: event.alert.symbol,
        price: event.price.price,
        threshold: event.alert.threshold,
        condition: event.alert.condition,
        changePercent: event.price.change24h,
      });
    } catch (error) {
      console.error('Failed to send notification for price alert:', error);
      // Don't throw - notification failure shouldn't break alert system
    }
  }

  /**
   * Get alert statistics
   */
  getStats(): {
    total: number;
    active: number;
    triggered: number;
  } {
    const alerts = Array.from(this.alerts.values());
    return {
      total: alerts.length,
      active: alerts.filter((a) => a.isActive).length,
      triggered: alerts.filter((a) => a.triggeredAt).length,
    };
  }
}

// Singleton instance
let alertManagerInstance: PriceAlertManager | null = null;

export function getPriceAlertManager(): PriceAlertManager {
  if (typeof window === 'undefined') {
    // Server-side, return a dummy instance
    return new PriceAlertManager();
  }

  if (!alertManagerInstance) {
    alertManagerInstance = new PriceAlertManager();
  }
  return alertManagerInstance;
}

// Helper function to create common alert types
export const createPriceAlert = {
  /**
   * Alert when price goes above a level
   */
  above: (params: {
    userId: string;
    symbol: string;
    chain: string;
    address: string;
    price: number;
    portfolioId?: string;
    agentId?: string;
  }): Omit<PriceAlert, 'id' | 'createdAt'> => ({
    userId: params.userId,
    portfolioId: params.portfolioId,
    agentId: params.agentId,
    symbol: params.symbol,
    chain: params.chain,
    address: params.address,
    condition: 'ABOVE',
    threshold: params.price,
    isActive: true,
    message: `Alert: ${params.symbol} price went above $${params.price}`,
  }),

  /**
   * Alert when price goes below a level
   */
  below: (params: {
    userId: string;
    symbol: string;
    chain: string;
    address: string;
    price: number;
    portfolioId?: string;
    agentId?: string;
  }): Omit<PriceAlert, 'id' | 'createdAt'> => ({
    userId: params.userId,
    portfolioId: params.portfolioId,
    agentId: params.agentId,
    symbol: params.symbol,
    chain: params.chain,
    address: params.address,
    condition: 'BELOW',
    threshold: params.price,
    isActive: true,
    message: `Alert: ${params.symbol} price went below $${params.price}`,
  }),

  /**
   * Alert when price increases by percentage
   */
  upByPercent: (params: {
    userId: string;
    symbol: string;
    chain: string;
    address: string;
    percent: number;
    portfolioId?: string;
    agentId?: string;
  }): Omit<PriceAlert, 'id' | 'createdAt'> => ({
    userId: params.userId,
    portfolioId: params.portfolioId,
    agentId: params.agentId,
    symbol: params.symbol,
    chain: params.chain,
    address: params.address,
    condition: 'CHANGE_UP',
    threshold: params.percent,
    isActive: true,
    message: `Alert: ${params.symbol} price increased by ${params.percent}%`,
  }),

  /**
   * Alert when price decreases by percentage
   */
  downByPercent: (params: {
    userId: string;
    symbol: string;
    chain: string;
    address: string;
    percent: number;
    portfolioId?: string;
    agentId?: string;
  }): Omit<PriceAlert, 'id' | 'createdAt'> => ({
    userId: params.userId,
    portfolioId: params.portfolioId,
    agentId: params.agentId,
    symbol: params.symbol,
    chain: params.chain,
    address: params.address,
    condition: 'CHANGE_DOWN',
    threshold: params.percent,
    isActive: true,
    message: `Alert: ${params.symbol} price decreased by ${params.percent}%`,
  }),
};
