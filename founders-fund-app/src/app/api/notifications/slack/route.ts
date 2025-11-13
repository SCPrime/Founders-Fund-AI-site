/**
 * Slack Notification API
 *
 * POST /api/notifications/slack
 * Send notification to Slack webhook
 */

import { getNotificationService, NotificationPayload } from '@/lib/notifications';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, ...payload } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Slack webhook URL is required' }, { status: 400 });
    }

    const notificationService = getNotificationService({
      slackWebhookUrl: webhookUrl,
      enabledChannels: ['slack'],
    });

    const success = await notificationService.sendSlack(payload as NotificationPayload);

    if (!success) {
      return NextResponse.json({ error: 'Failed to send Slack notification' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Slack notification sent successfully',
    });
  } catch (error) {
    console.error('Slack notification API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send Slack notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/notifications/slack
 * Get API information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Slack Notification API',
    description: 'Send notifications to Slack webhook',
    endpoint: '/api/notifications/slack',
    method: 'POST',
    requiredFields: {
      webhookUrl: 'Slack webhook URL',
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
