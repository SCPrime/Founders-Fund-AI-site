/**
 * Price Alerts API Routes
 *
 * Endpoints for managing price alerts
 * - GET: List all alerts for user
 * - POST: Create new alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const portfolioId = searchParams.get('portfolioId');
    const agentId = searchParams.get('agentId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const where: any = { userId };
    if (portfolioId) where.portfolioId = portfolioId;
    if (agentId) where.agentId = agentId;
    if (activeOnly) where.isActive = true;

    const alerts = await prisma.priceAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      userId: alert.userId,
      portfolioId: alert.portfolioId,
      agentId: alert.agentId,
      symbol: alert.symbol,
      chain: alert.chain,
      address: alert.address,
      condition: alert.condition,
      threshold: Number(alert.threshold),
      isActive: alert.isActive,
      message: alert.message,
      createdAt: alert.createdAt.toISOString(),
      triggeredAt: alert.triggeredAt?.toISOString(),
    }));

    return NextResponse.json({
      alerts: formattedAlerts,
      count: formattedAlerts.length,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      portfolioId,
      agentId,
      symbol,
      chain,
      address,
      condition,
      threshold,
      message,
    } = body;

    // Validate required fields
    if (!userId || !symbol || !chain || !address || !condition || threshold === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate condition
    const validConditions = ['ABOVE', 'BELOW', 'CHANGE_UP', 'CHANGE_DOWN'];
    if (!validConditions.includes(condition)) {
      return NextResponse.json(
        { error: 'Invalid condition. Must be one of: ' + validConditions.join(', ') },
        { status: 400 }
      );
    }

    // Create alert
    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        portfolioId: portfolioId || null,
        agentId: agentId || null,
        symbol,
        chain,
        address,
        condition,
        threshold,
        message: message || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      alert: {
        id: alert.id,
        userId: alert.userId,
        portfolioId: alert.portfolioId,
        agentId: alert.agentId,
        symbol: alert.symbol,
        chain: alert.chain,
        address: alert.address,
        condition: alert.condition,
        threshold: Number(alert.threshold),
        isActive: alert.isActive,
        message: alert.message,
        createdAt: alert.createdAt.toISOString(),
      },
      message: 'Alert created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
