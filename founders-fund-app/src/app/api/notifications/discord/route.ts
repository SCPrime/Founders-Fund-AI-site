/**
 * Discord Notification API
 *
 * POST /api/notifications/discord
 * Send notification to Discord webhook
 */

import { getNotificationService, NotificationPayload } from '@/lib/notifications';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, ...payload } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Discord webhook URL is required' }, { status: 400 });
    }

    const notificationService = getNotificationService({
      discordWebhookUrl: webhookUrl,
      enabledChannels: ['discord'],
    });

    const success = await notificationService.sendDiscord(payload as NotificationPayload);

    if (!success) {
      return NextResponse.json({ error: 'Failed to send Discord notification' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Discord notification sent successfully',
    });
  } catch (error) {
    console.error('Discord notification API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send Discord notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/notifications/discord
 * Get API information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Discord Notification API',
    description: 'Send notifications to Discord webhook',
    endpoint: '/api/notifications/discord',
    method: 'POST',
    requiredFields: {
      webhookUrl: 'Discord webhook URL',
      title: 'Notification title',
      message: 'Notification message',
    },
    optionalFields: {
      color: 'success | warning | error | info',
      fields: 'Array of { name, value, inline } objects',
      timestamp: 'ISO date string',
      footer: 'Footer text',
    },
  });
}
