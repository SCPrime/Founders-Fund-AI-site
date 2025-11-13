/**
 * POST /api/reports/trade-history
 * Generate Trade History PDF Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { PDFGenerator } from '@/lib/pdfGenerator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      portfolioId,
      agentId,
      dateRange = 30,
      options = {},
    } = body as {
      portfolioId?: string;
      agentId?: string;
      dateRange?: 7 | 30 | 90 | 365;
      options?: {
        includeCharts?: boolean;
        saveToDatabase?: boolean;
        format?: 'a4' | 'letter';
      };
    };

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    // Build query filters
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (agentId) {
      whereClause.agentId = agentId;
    } else if (portfolioId) {
      // Get all agents in portfolio
      const agents = await prisma.agent.findMany({
        where: { portfolioId },
        select: { id: true },
      });
      whereClause.agentId = {
        in: agents.map((a) => a.id),
      };
    }

    // Fetch trades
    const trades = await prisma.trade.findMany({
      where: whereClause,
      include: {
        agent: {
          select: {
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Calculate summary statistics
    const totalTrades = trades.length;
    const totalVolume = trades.reduce(
      (sum, t) => sum + Number(t.amount) * Number(t.price),
      0
    );
    const totalFees = trades.reduce((sum, t) => sum + Number(t.fees), 0);
    const totalProfit = trades.reduce(
      (sum, t) => sum + (t.pnl ? Number(t.pnl) : 0),
      0
    );
    const profitableTrades = trades.filter((t) => t.pnl && Number(t.pnl) > 0).length;
    const losingTrades = trades.filter((t) => t.pnl && Number(t.pnl) < 0).length;

    // Prepare report data
    const reportData = {
      title: agentId
        ? `Trade History: ${trades[0]?.agent.name || 'Agent'}`
        : 'Portfolio Trade History',
      window: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      trades: trades.map((t) => ({
        date: new Date(t.timestamp).toLocaleString(),
        agentName: agentId ? undefined : t.agent.name,
        symbol: t.agent.symbol,
        type: t.side,
        amount: Number(t.amount),
        price: Number(t.price),
        value: Number(t.amount) * Number(t.price),
        fees: Number(t.fees),
        profit: t.pnl ? Number(t.pnl) : undefined,
      })),
      summary: {
        totalTrades,
        totalVolume,
        totalFees,
        totalProfit,
        profitableTrades,
        losingTrades,
      },
    };

    // Generate PDF
    const generator = new PDFGenerator({
      orientation: 'landscape', // Better for trade tables
      format: options.format || 'letter',
    });
    const pdf = generator.generateTradeHistoryReport(reportData);

    // Get PDF as blob
    const pdfBlob = pdf.output('blob');
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = agentId
      ? `trade-history-agent-${timestamp}.pdf`
      : `trade-history-portfolio-${timestamp}.pdf`;

    // Save to database if requested
    if (options.saveToDatabase) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (user) {
          await prisma.report.create({
            data: {
              userId: user.id,
              portfolioId: portfolioId || null,
              agentId: agentId || null,
              reportType: 'TRADE_HISTORY',
              title: reportData.title,
              description: `${dateRange}-day trade history (${totalTrades} trades)`,
              fileName: filename,
              fileSize: pdfBuffer.length,
              fileBlob: pdfBuffer,
              mimeType: 'application/pdf',
              metadata: {
                dateRange,
                totalTrades,
                totalProfit,
                totalVolume,
                totalFees,
              },
            },
          });
        }
      } catch (dbError) {
        console.error('Failed to save report to database:', dbError);
      }
    }

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Trade history report generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate trade history report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
