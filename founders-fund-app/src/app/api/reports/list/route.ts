/**
 * GET /api/reports/list
 * List all reports for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');
    const agentId = searchParams.get('agentId');
    const reportType = searchParams.get('reportType');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (portfolioId) {
      where.portfolioId = portfolioId;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (reportType) {
      where.reportType = reportType;
    }

    // Fetch reports
    const reports = await prisma.report.findMany({
      where,
      orderBy: {
        generatedAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        reportType: true,
        title: true,
        description: true,
        fileName: true,
        fileSize: true,
        generatedAt: true,
        downloadCount: true,
        metadata: true,
        portfolioId: true,
        agentId: true,
      },
    });

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (error) {
    console.error('Report list error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch reports',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
