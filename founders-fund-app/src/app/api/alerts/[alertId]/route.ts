/**
 * Individual Price Alert API Routes
 *
 * - GET: Get alert by ID
 * - PATCH: Update alert
 * - DELETE: Delete alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{
    alertId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { alertId } = await params;

    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

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
        triggeredAt: alert.triggeredAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { alertId } = await params;
    const body = await request.json();

    const { condition, threshold, isActive, message } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (condition !== undefined) updateData.condition = condition;
    if (threshold !== undefined) updateData.threshold = threshold;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (message !== undefined) updateData.message = message;

    // Validate condition if provided
    if (condition) {
      const validConditions = ['ABOVE', 'BELOW', 'CHANGE_UP', 'CHANGE_DOWN'];
      if (!validConditions.includes(condition)) {
        return NextResponse.json(
          { error: 'Invalid condition. Must be one of: ' + validConditions.join(', ') },
          { status: 400 }
        );
      }
    }

    const alert = await prisma.priceAlert.update({
      where: { id: alertId },
      data: updateData,
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
        triggeredAt: alert.triggeredAt?.toISOString(),
      },
      message: 'Alert updated successfully',
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { alertId } = await params;

    await prisma.priceAlert.delete({
      where: { id: alertId },
    });

    return NextResponse.json({
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}
