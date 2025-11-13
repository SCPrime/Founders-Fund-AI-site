/**
 * POST /api/reports/agent-performance
 * Generate Agent Performance PDF Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { PDFGenerator, type AgentPerformanceReportData } from '@/lib/pdfGenerator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      agentId,
      dateRange = 30, // days
      options = {},
    } = body as {
      agentId: string;
      dateRange?: 7 | 30 | 90;
      options?: {
        includeCharts?: boolean;
        saveToDatabase?: boolean;
        format?: 'a4' | 'letter';
      };
    };

    // Validate inputs
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // Fetch agent data
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        trades: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
        performance: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    // Filter trades within date range
    const filteredTrades = agent.trades.filter(
      (t) => new Date(t.timestamp) >= startDate && new Date(t.timestamp) <= endDate
    );

    // Calculate performance metrics
    const totalTrades = filteredTrades.length;
    const profitableTrades = filteredTrades.filter((t) => t.pnl && Number(t.pnl) > 0).length;
    const totalProfit = filteredTrades.reduce(
      (sum, t) => sum + (t.pnl ? Number(t.pnl) : 0),
      0
    );
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    const averageReturn = totalTrades > 0 ? totalProfit / totalTrades : 0;

    // Calculate best/worst trades
    const tradesWithPnl = filteredTrades.filter((t) => t.pnl !== null);
    const bestTrade =
      tradesWithPnl.length > 0
        ? Math.max(...tradesWithPnl.map((t) => Number(t.pnl)))
        : 0;
    const worstTrade =
      tradesWithPnl.length > 0
        ? Math.min(...tradesWithPnl.map((t) => Number(t.pnl)))
        : 0;

    // Calculate average hold time (simplified - would need buy/sell matching in production)
    const averageHoldTime = '2.5 hours'; // Placeholder

    // Prepare report data
    const reportData: AgentPerformanceReportData = {
      agentName: agent.name,
      window: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      totalTrades,
      profitableTrades,
      totalProfit,
      winRate,
      averageReturn,
      trades: filteredTrades.map((t) => ({
        date: new Date(t.timestamp).toLocaleString(),
        symbol: agent.symbol,
        type: t.side,
        amount: Number(t.amount),
        price: Number(t.price),
        profit: t.pnl ? Number(t.pnl) : undefined,
      })),
      performance: {
        bestTrade,
        worstTrade,
        averageHoldTime,
      },
    };

    // Generate PDF
    const generator = new PDFGenerator({
      orientation: 'portrait',
      format: options.format || 'letter',
    });
    const pdf = generator.generateAgentPerformanceReport(reportData);

    // Get PDF as blob
    const pdfBlob = pdf.getBlob();
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `agent-performance-${agent.symbol}-${timestamp}.pdf`;

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
              portfolioId: agent.portfolioId,
              agentId: agent.id,
              reportType: 'AGENT_PERFORMANCE',
              title: `Agent Performance: ${agent.name}`,
              description: `${dateRange}-day performance report for ${agent.name} (${agent.symbol})`,
              fileName: filename,
              fileSize: pdfBuffer.length,
              fileBlob: pdfBuffer,
              mimeType: 'application/pdf',
              metadata: {
                agentName: agent.name,
                symbol: agent.symbol,
                dateRange,
                totalProfit,
                winRate,
                totalTrades,
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
    console.error('Agent performance report generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate agent performance report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
