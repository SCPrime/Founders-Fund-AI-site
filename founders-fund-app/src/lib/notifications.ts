/**
 * Notification Service
 *
 * Unified notification system for Discord and Slack webhooks
 * Supports PNL alerts, trade notifications, agent status changes, and more
 */

export type NotificationChannel = 'discord' | 'slack' | 'email';

export interface NotificationConfig {
  discordWebhookUrl?: string;
  slackWebhookUrl?: string;
  enabledChannels?: NotificationChannel[];
}

export interface NotificationPayload {
  title: string;
  message: string;
  color?: 'success' | 'warning' | 'error' | 'info';
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: Date;
  footer?: string;
}

export interface PNLAlertNotification {
  type: 'pnl_alert';
  dailyPnl: number;
  dailyPnlPercent: number;
  threshold: number;
  direction: 'up' | 'down';
  portfolioId?: string;
  portfolioName?: string;
}

export interface TradeNotification {
  type: 'trade';
  agentId: string;
  agentName: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  value: number;
  pnl?: number;
}

export interface AgentStatusNotification {
  type: 'agent_status';
  agentId: string;
  agentName: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  reason?: string;
}

export interface PriceAlertNotification {
  type: 'price_alert';
  symbol: string;
  price: number;
  threshold: number;
  condition: 'ABOVE' | 'BELOW' | 'CHANGE_UP' | 'CHANGE_DOWN';
  changePercent?: number;
}

export type Notification =
  | PNLAlertNotification
  | TradeNotification
  | AgentStatusNotification
  | PriceAlertNotification;

export class NotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig = {}) {
    this.config = {
      enabledChannels: config.enabledChannels || ['discord', 'slack'],
      ...config,
    };
  }

  /**
   * Send notification to Discord webhook
   */
  async sendDiscord(payload: NotificationPayload): Promise<boolean> {
    if (!this.config.discordWebhookUrl) {
      console.warn('Discord webhook URL not configured');
      return false;
    }

    if (!this.config.enabledChannels?.includes('discord')) {
      return false;
    }

    try {
      const discordColor = this.getDiscordColor(payload.color || 'info');

      const discordPayload = {
        embeds: [
          {
            title: payload.title,
            description: payload.message,
            color: discordColor,
            fields: payload.fields?.map((f) => ({
              name: f.name,
              value: f.value,
              inline: f.inline ?? false,
            })),
            timestamp: (payload.timestamp || new Date()).toISOString(),
            footer: payload.footer ? { text: payload.footer } : undefined,
          },
        ],
      };

      const response = await fetch(this.config.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      if (!response.ok) {
        console.error('Discord notification failed:', response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Discord notification error:', error);
      return false;
    }
  }

  /**
   * Send notification to Slack webhook
   */
  async sendSlack(payload: NotificationPayload): Promise<boolean> {
    if (!this.config.slackWebhookUrl) {
      console.warn('Slack webhook URL not configured');
      return false;
    }

    if (!this.config.enabledChannels?.includes('slack')) {
      return false;
    }

    try {
      const slackColor = this.getSlackColor(payload.color || 'info');

      const slackPayload = {
        text: payload.title,
        attachments: [
          {
            color: slackColor,
            text: payload.message,
            fields: payload.fields?.map((f) => ({
              title: f.name,
              value: f.value,
              short: f.inline ?? false,
            })),
            footer: payload.footer,
            ts: Math.floor((payload.timestamp || new Date()).getTime() / 1000),
          },
        ],
      };

      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });

      if (!response.ok) {
        console.error('Slack notification failed:', response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Slack notification error:', error);
      return false;
    }
  }

  /**
   * Send notification to all enabled channels
   */
  async send(payload: NotificationPayload): Promise<{ discord: boolean; slack: boolean }> {
    const [discord, slack] = await Promise.all([
      this.sendDiscord(payload),
      this.sendSlack(payload),
    ]);

    return { discord, slack };
  }

  /**
   * Send PNL alert notification
   */
  async sendPNLAlert(notification: PNLAlertNotification): Promise<void> {
    const isPositive = notification.dailyPnl >= 0;
    const emoji = isPositive ? '📈' : '📉';
    const color = isPositive ? 'success' : 'error';

    const payload: NotificationPayload = {
      title: `${emoji} Daily PNL Alert`,
      message: `Daily PNL ${notification.direction === 'up' ? 'exceeded' : 'dropped below'} threshold`,
      color,
      fields: [
        { name: 'Daily PNL', value: `$${notification.dailyPnl.toFixed(2)}`, inline: true },
        { name: 'Daily PNL %', value: `${notification.dailyPnlPercent.toFixed(2)}%`, inline: true },
        { name: 'Threshold', value: `${notification.threshold}%`, inline: true },
      ],
      footer: notification.portfolioName || 'Founders Fund AI Trading Platform',
    };

    if (notification.portfolioId) {
      payload.fields?.push({
        name: 'Portfolio ID',
        value: notification.portfolioId,
        inline: false,
      });
    }

    await this.send(payload);
  }

  /**
   * Send trade execution notification
   */
  async sendTradeNotification(notification: TradeNotification): Promise<void> {
    const emoji = notification.side === 'BUY' ? '🟢' : '🔴';
    const color = notification.side === 'BUY' ? 'success' : 'warning';

    const payload: NotificationPayload = {
      title: `${emoji} Trade Executed`,
      message: `${notification.agentName} ${notification.side} ${notification.symbol}`,
      color,
      fields: [
        { name: 'Agent', value: notification.agentName, inline: true },
        { name: 'Symbol', value: notification.symbol, inline: true },
        { name: 'Side', value: notification.side, inline: true },
        { name: 'Amount', value: notification.amount.toFixed(4), inline: true },
        { name: 'Price', value: `$${notification.price.toFixed(6)}`, inline: true },
        { name: 'Value', value: `$${notification.value.toFixed(2)}`, inline: true },
      ],
      footer: 'Founders Fund AI Trading Platform',
    };

    if (notification.pnl !== undefined) {
      const pnlColor = notification.pnl >= 0 ? 'success' : 'error';
      payload.fields?.push({
        name: 'P&L',
        value: `$${notification.pnl.toFixed(2)}`,
        inline: true,
      });
      payload.color = pnlColor;
    }

    await this.send(payload);
  }

  /**
   * Send agent status change notification
   */
  async sendAgentStatusNotification(notification: AgentStatusNotification): Promise<void> {
    const emoji =
      notification.status === 'ACTIVE' ? '✅' : notification.status === 'PAUSED' ? '⏸️' : '❌';
    const color =
      notification.status === 'ACTIVE'
        ? 'success'
        : notification.status === 'PAUSED'
          ? 'warning'
          : 'error';

    const payload: NotificationPayload = {
      title: `${emoji} Agent Status Changed`,
      message: `${notification.agentName} is now ${notification.status}`,
      color,
      fields: [
        { name: 'Agent', value: notification.agentName, inline: true },
        { name: 'Status', value: notification.status, inline: true },
      ],
      footer: 'Founders Fund AI Trading Platform',
    };

    if (notification.reason) {
      payload.fields?.push({ name: 'Reason', value: notification.reason, inline: false });
    }

    await this.send(payload);
  }

  /**
   * Send price alert notification
   */
  async sendPriceAlertNotification(notification: PriceAlertNotification): Promise<void> {
    const emoji =
      notification.condition === 'ABOVE' || notification.condition === 'CHANGE_UP' ? '📈' : '📉';
    const color =
      notification.condition === 'ABOVE' || notification.condition === 'CHANGE_UP'
        ? 'success'
        : 'error';

    const payload: NotificationPayload = {
      title: `${emoji} Price Alert Triggered`,
      message: `${notification.symbol} price alert condition met`,
      color,
      fields: [
        { name: 'Symbol', value: notification.symbol, inline: true },
        { name: 'Current Price', value: `$${notification.price.toFixed(6)}`, inline: true },
        { name: 'Condition', value: notification.condition, inline: true },
        { name: 'Threshold', value: `$${notification.threshold.toFixed(6)}`, inline: true },
      ],
      footer: 'Founders Fund AI Trading Platform',
    };

    if (notification.changePercent !== undefined) {
      payload.fields?.push({
        name: 'Change %',
        value: `${notification.changePercent.toFixed(2)}%`,
        inline: true,
      });
    }

    await this.send(payload);
  }

  /**
   * Get Discord color code
   */
  private getDiscordColor(color: 'success' | 'warning' | 'error' | 'info'): number {
    const colors = {
      success: 0x16a34a, // Green
      warning: 0xf59e0b, // Amber
      error: 0xdc2626, // Red
      info: 0x2563eb, // Blue
    };
    return colors[color];
  }

  /**
   * Get Slack color code
   */
  private getSlackColor(color: 'success' | 'warning' | 'error' | 'info'): string {
    const colors = {
      success: 'good',
      warning: 'warning',
      error: 'danger',
      info: '#2563eb',
    };
    return colors[color];
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(config?: NotificationConfig): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService(config);
  }
  return notificationServiceInstance;
}
