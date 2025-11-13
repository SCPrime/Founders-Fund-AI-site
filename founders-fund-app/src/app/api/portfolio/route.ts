import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contributionToCashflowLeg } from '@/types/prisma';
import type { LegType } from '@prisma/client';

// GET /api/portfolio - List all portfolios or get specific portfolio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('id');

    if (portfolioId) {
      // Get specific portfolio with relations
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
        include: {
          contributions: true,
          snapshots: {
            orderBy: { timestamp: 'desc' },
            take: 10 // Limit to last 10 snapshots
          }
        }
      });

      if (!portfolio) {
        return NextResponse.json(
          { error: 'Portfolio not found' },
          { status: 404 }
        );
      }

      // Convert Prisma contributions to CashflowLeg format
      const contributionsFormatted = portfolio.contributions.map(contributionToCashflowLeg);

      return NextResponse.json({
        ...portfolio,
        contributions: contributionsFormatted
      });
    } else {
      // List all portfolios
      const portfolios = await prisma.portfolio.findMany({
        include: {
          _count: {
            select: {
              contributions: true,
              snapshots: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json(portfolios);
    }
  } catch (error: unknown) {
    console.error('Portfolio GET failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// POST /api/portfolio - Create new portfolio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contributions, snapshots } = body;

    if (!name || !contributions) {
      return NextResponse.json(
        { error: 'Name and contributions are required in request body.' },
        { status: 400 }
      );
    }

    // Create portfolio with contributions in a transaction
    const portfolio = await prisma.$transaction(async (tx) => {
      // Create the portfolio
      const newPortfolio = await tx.portfolio.create({
        data: { name }
      });

      // Add contributions
      if (contributions.length > 0) {
        const contributionData = contributions.map((leg: any) => ({
          portfolioId: newPortfolio.id,
          owner: leg.owner,
          name: leg.name,
          type: leg.type as LegType,
          amount: leg.amount,
          ts: new Date(leg.ts),
          earnsDollarDaysThisWindow: leg.earnsDollarDaysThisWindow
        }));

        await tx.contribution.createMany({
          data: contributionData
        });
      }

      // Add snapshots if provided
      if (snapshots && snapshots.length > 0) {
        const snapshotData = snapshots.map((snap: any) => ({
          portfolioId: newPortfolio.id,
          timestamp: snap.timestamp ? new Date(snap.timestamp) : new Date(),
          windowStart: new Date(snap.window.start),
          windowEnd: new Date(snap.window.end),
          profitTotal: snap.profitTotal,
          realizedProfit: snap.realized,
          unrealizedPnl: snap.unrealized
        }));

        await tx.snapshot.createMany({
          data: snapshotData
        });
      }

      return newPortfolio;
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error: unknown) {
    console.error('Portfolio creation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolio - Update existing portfolio
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Portfolio id is required for update.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { contributions } = body;

    if (!contributions) {
      return NextResponse.json(
        { error: 'Contributions are required in request body for update.' },
        { status: 400 }
      );
    }

    // Replace contributions: delete old ones and add new (simplistic approach)
    const result = await prisma.$transaction(async (tx) => {
      await tx.contribution.deleteMany({ where: { portfolioId: id } });

      const updatedContribs = await tx.contribution.createMany({
        data: contributions.map((leg: any) => ({
          portfolioId: id,
          owner: leg.owner,
          name: leg.name,
          type: leg.type as LegType,
          amount: leg.amount,
          ts: new Date(leg.ts),
          earnsDollarDaysThisWindow: leg.earnsDollarDaysThisWindow
        }))
      });

      return updatedContribs;
    });

    return NextResponse.json({ message: 'Portfolio updated', count: result.count });
  } catch (error: unknown) {
    console.error('Portfolio update failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio - Delete portfolio
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('id');

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'Portfolio ID is required' },
        { status: 400 }
      );
    }

    // Delete portfolio (cascades to contributions and snapshots)
    await prisma.portfolio.delete({
      where: { id: portfolioId }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Portfolio deletion failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}