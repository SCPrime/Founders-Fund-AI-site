/**
 * POST /api/reports/portfolio-summary
 * Generate Portfolio Summary PDF Report
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import {
  PDFGenerator,
  generatePortfolioReportFromAllocation,
  type PortfolioPerformanceReportData,
} from '@/lib/pdfGenerator';
import type { AllocationState, AllocationOutputs } from '@/types/allocation';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      portfolioId,
      allocationState,
      allocationOutputs,
      options = {},
    } = body as {
      portfolioId?: string;
      allocationState: AllocationState;
      allocationOutputs: AllocationOutputs;
      options?: {
        includeCharts?: boolean;
        saveToDatabase?: boolean;
        format?: 'a4' | 'letter';
      };
    };

    // Validate inputs
    if (!allocationState || !allocationOutputs) {
      return NextResponse.json(
        { error: 'Missing required allocation data' },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdf = generatePortfolioReportFromAllocation(allocationState, allocationOutputs);

    // Get PDF as blob
    const pdfBlob = pdf.getBlob();
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `portfolio-summary-${timestamp}.pdf`;

    // Save to database if requested
    if (options.saveToDatabase) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
        });

        if (user) {
          const report = await prisma.report.create({
            data: {
              userId: user.id,
              portfolioId: portfolioId || null,
              reportType: 'PORTFOLIO_PERFORMANCE',
              title: 'Portfolio Performance Summary',
              description: `Period: ${allocationState.window.start} to ${allocationState.window.end}`,
              fileName: filename,
              fileSize: pdfBuffer.length,
              fileBlob: pdfBuffer,
              mimeType: 'application/pdf',
              metadata: {
                window: allocationState.window,
                totalProfit: allocationOutputs.profitTotal,
                participantCount: Object.keys(allocationOutputs.dollarDays.investors).length + 1,
              },
            },
          });

          console.log('Report saved to database:', report.id);
        }
      } catch (dbError) {
        console.error('Failed to save report to database:', dbError);
        // Continue anyway - report generation succeeded
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
    console.error('Portfolio summary report generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate portfolio summary report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
