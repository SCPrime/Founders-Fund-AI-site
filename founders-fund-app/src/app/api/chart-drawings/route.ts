/**
 * Chart Drawings API Route
 *
 * Handles saving and loading chart drawings/annotations for users
 * Supports portfolio-specific and agent-specific drawings
 *
 * GET: Load drawings for a user/portfolio/agent
 * POST: Save drawings for a user/portfolio/agent
 *
 * MOD SQUAD TEAM ULTRA - Agent #5 (Chart & Visualization Expert)
 */

import type { DrawingTool } from '@/components/Charts/types';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/chart-drawings
 * Load drawings for the authenticated user
 * Query params: portfolioId?, agentId?
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }
    const { session } = authResult;
    const userId = session.user.id;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolioId') || undefined;
    const agentId = searchParams.get('agentId') || undefined;

    // Build query filter
    const where: {
      userId: string;
      portfolioId?: string | null;
      agentId?: string | null;
    } = {
      userId,
    };

    if (portfolioId) {
      where.portfolioId = portfolioId;
    }
    if (agentId) {
      where.agentId = agentId;
    }

    // Fetch drawings from database
    const chartDrawings = await prisma.chartDrawing.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: 1, // Get the most recent drawing set
    });

    // Extract drawings from the most recent record
    let drawings: DrawingTool[] = [];
    if (chartDrawings.length > 0) {
      const drawingData = chartDrawings[0].drawingData;
      // Prisma Json type can be array, object, or primitive
      if (Array.isArray(drawingData)) {
        // Type assertion through unknown for safety
        drawings = drawingData as unknown as DrawingTool[];
      } else if (
        typeof drawingData === 'object' &&
        drawingData !== null &&
        'drawings' in drawingData
      ) {
        // Handle object with drawings property
        const dataObj = drawingData as unknown as { drawings: DrawingTool[] };
        drawings = Array.isArray(dataObj.drawings) ? dataObj.drawings : [];
      }
    }

    return NextResponse.json({
      success: true,
      drawings,
      count: drawings.length,
    });
  } catch (error) {
    console.error('Error loading chart drawings:', error);
    return NextResponse.json(
      {
        error: 'Failed to load chart drawings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chart-drawings
 * Save drawings for the authenticated user
 * Body: { portfolioId?, agentId?, drawings: DrawingTool[] }
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth();
    if (authResult.error) {
      return authResult.error;
    }
    const { session } = authResult;
    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { portfolioId, agentId, drawings } = body;

    // Validate drawings array
    if (!Array.isArray(drawings)) {
      return NextResponse.json(
        {
          error: 'Invalid request: drawings must be an array',
        },
        { status: 400 },
      );
    }

    // Validate each drawing has required fields
    for (const drawing of drawings) {
      if (!drawing.id || !drawing.type || !Array.isArray(drawing.points)) {
        return NextResponse.json(
          {
            error: 'Invalid drawing format: each drawing must have id, type, and points',
          },
          { status: 400 },
        );
      }
    }

    // Save to database
    // We store all drawings as a single JSON object per user/portfolio/agent combination
    // Prisma Json type accepts arrays directly
    const chartDrawing = await prisma.chartDrawing.create({
      data: {
        userId,
        portfolioId: portfolioId || null,
        agentId: agentId || null,
        drawingData: drawings as unknown as any, // Prisma Json type accepts any JSON-serializable value
      },
    });

    return NextResponse.json({
      success: true,
      id: chartDrawing.id,
      message: `Saved ${drawings.length} drawing(s) successfully`,
      count: drawings.length,
    });
  } catch (error) {
    console.error('Error saving chart drawings:', error);
    return NextResponse.json(
      {
        error: 'Failed to save chart drawings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
