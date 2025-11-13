/**
 * POST /api/reports/multi-agent
 * Generate Multi-Agent Consolidated PDF Report (10-15 pages)
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
      dateRange = 30,
      options = {},
    } = body as {
      portfolioId: string;
      dateRange?: 7 | 30 | 90 | 365;
      options?: {
        includeCharts?: boolean;
        saveToDatabase?: boolean;
        format?: 'a4' | 'letter';
      };
    };

    // Validate inputs
    if (!portfolioId) {
      return NextResponse.json({ error: 'Portfolio ID is required' }, { status: 400 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    // Fetch portfolio data
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        agents: {
          include: {
            trades: {
              where: {
                timestamp: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
            performance: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Calculate portfolio-level metrics
    const allTrades = portfolio.agents.flatMap((a) => a.trades);
    const totalTrades = allTrades.length;

    // Calculate agent metrics
    const agentMetrics = portfolio.agents.map((agent) => {
      const agentTrades = agent.trades;
      const totalPnl = agentTrades.reduce(
        (sum, t) => sum + (t.pnl ? Number(t.pnl) : 0),
        0
      );
      const profitableTrades = agentTrades.filter(
        (t) => t.pnl && Number(t.pnl) > 0
      ).length;
      const winRate =
        agentTrades.length > 0 ? (profitableTrades / agentTrades.length) * 100 : 0;

      const latestPerf = agent.performance[0];
      const currentValue = latestPerf ? Number(latestPerf.totalValue) : Number(agent.allocation);

      return {
        name: agent.name,
        symbol: agent.symbol,
        allocation: Number(agent.allocation),
        currentValue,
        totalPnl,
        winRate,
        totalTrades: agentTrades.length,
        status: agent.status,
      };
    });

    // Calculate portfolio totals
    const totalValue = agentMetrics.reduce((sum, a) => sum + a.currentValue, 0);
    const totalProfit = agentMetrics.reduce((sum, a) => sum + a.totalPnl, 0);
    const avgWinRate =
      agentMetrics.length > 0
        ? agentMetrics.reduce((sum, a) => sum + a.winRate, 0) / agentMetrics.length
        : 0;

    // Prepare report data
    const reportData = {
      title: `Multi-Agent Performance Report: ${portfolio.name}`,
      window: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      portfolio: {
        totalValue,
        totalProfit,
        totalTrades,
        avgWinRate,
      },
      agents: agentMetrics.sort((a, b) => b.totalPnl - a.totalPnl), // Sort by profit
      chartImages: options.includeCharts
        ? {
            // Placeholder for chart images
            // In production, these would be generated from chart-to-image utility
            performanceChart: undefined,
            allocationChart: undefined,
            comparisonChart: undefined,
          }
        : undefined,
    };

    // Generate PDF
    const generator = new PDFGenerator({
      orientation: 'portrait',
      format: options.format || 'letter',
      includePageNumbers: true,
    });
    const pdf = generator.generateMultiAgentReport(reportData);

    // Get PDF as blob
    const pdfBlob = pdf.getBlob();
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `multi-agent-report-${portfolio.name.replace(/\s+/g, '-')}-${timestamp}.pdf`;

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
              portfolioId: portfolio.id,
              reportType: 'MULTI_AGENT_CONSOLIDATED',
              title: reportData.title,
              description: `${dateRange}-day consolidated report for ${portfolio.agents.length} agents`,
              fileName: filename,
              fileSize: pdfBuffer.length,
              fileBlob: pdfBuffer,
              mimeType: 'application/pdf',
              metadata: {
                dateRange,
                agentCount: portfolio.agents.length,
                totalProfit,
                totalTrades,
                avgWinRate,
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
    console.error('Multi-agent report generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate multi-agent report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
