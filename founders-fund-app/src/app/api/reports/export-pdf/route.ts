/**
 * PDF Export API Endpoint
 * Generates and returns PDF reports for various report types
 * Supports Individual Investor, Portfolio Performance, Agent Performance, and Agent Comparison reports
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PDFGenerator,
  generateIndividualInvestorReportFromAllocation,
  generatePortfolioReportFromAllocation,
  type IndividualInvestorReportData,
  type PortfolioPerformanceReportData,
  type AgentPerformanceReportData,
  type AgentComparisonReportData,
} from '@/lib/pdfGenerator';
import type { AllocationState, AllocationOutputs } from '@/types/allocation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ExportPDFRequest {
  reportType: 'individual-investor' | 'portfolio-performance' | 'agent-performance' | 'agent-comparison';
  data?: IndividualInvestorReportData | PortfolioPerformanceReportData | AgentPerformanceReportData | AgentComparisonReportData;

  // For allocation-based reports
  allocationState?: AllocationState;
  allocationOutputs?: AllocationOutputs;
  investorName?: string; // Required for individual investor reports

  // Options
  filename?: string;
  returnAs?: 'blob' | 'base64' | 'buffer';
}

/**
 * POST /api/reports/export-pdf
 * Generate and export PDF reports
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExportPDFRequest;
    const { reportType, data, allocationState, allocationOutputs, investorName, filename, returnAs = 'blob' } = body;

    if (!reportType) {
      return NextResponse.json(
        { error: 'Report type is required' },
        { status: 400 }
      );
    }

    let pdfDoc: any;
    let defaultFilename = 'report.pdf';

    switch (reportType) {
      case 'individual-investor': {
        if (data && 'investorName' in data) {
          // Use provided data
          const generator = new PDFGenerator();
          pdfDoc = generator.generateIndividualInvestorReport(data as IndividualInvestorReportData);
          defaultFilename = `investor-report-${data.investorName}-${new Date().toISOString().split('T')[0]}.pdf`;
        } else if (allocationState && allocationOutputs && investorName) {
          // Generate from allocation data
          pdfDoc = generateIndividualInvestorReportFromAllocation(investorName, allocationState, allocationOutputs);
          defaultFilename = `investor-report-${investorName}-${new Date().toISOString().split('T')[0]}.pdf`;
        } else {
          return NextResponse.json(
            { error: 'Invalid data for individual investor report. Provide either complete data or allocation state with investor name.' },
            { status: 400 }
          );
        }
        break;
      }

      case 'portfolio-performance': {
        if (data && 'participants' in data) {
          // Use provided data
          const generator = new PDFGenerator();
          pdfDoc = generator.generatePortfolioPerformanceReport(data as PortfolioPerformanceReportData);
          defaultFilename = `portfolio-report-${new Date().toISOString().split('T')[0]}.pdf`;
        } else if (allocationState && allocationOutputs) {
          // Generate from allocation data
          pdfDoc = generatePortfolioReportFromAllocation(allocationState, allocationOutputs);
          defaultFilename = `portfolio-report-${new Date().toISOString().split('T')[0]}.pdf`;
        } else {
          return NextResponse.json(
            { error: 'Invalid data for portfolio performance report. Provide either complete data or allocation state.' },
            { status: 400 }
          );
        }
        break;
      }

      case 'agent-performance': {
        if (data && 'agentName' in data) {
          const generator = new PDFGenerator();
          pdfDoc = generator.generateAgentPerformanceReport(data as AgentPerformanceReportData);
          const agentData = data as AgentPerformanceReportData;
          defaultFilename = `agent-report-${agentData.agentName}-${new Date().toISOString().split('T')[0]}.pdf`;
        } else {
          return NextResponse.json(
            { error: 'Agent performance data is required' },
            { status: 400 }
          );
        }
        break;
      }

      case 'agent-comparison': {
        if (data && 'agents' in data) {
          const generator = new PDFGenerator();
          pdfDoc = generator.generateAgentComparisonReport(data as AgentComparisonReportData);
          defaultFilename = `agent-comparison-${new Date().toISOString().split('T')[0]}.pdf`;
        } else {
          return NextResponse.json(
            { error: 'Agent comparison data is required' },
            { status: 400 }
          );
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unsupported report type: ${reportType}` },
          { status: 400 }
        );
    }

    // Get the PDF output based on requested format
    const finalFilename = filename || defaultFilename;

    if (returnAs === 'base64') {
      const base64 = pdfDoc.output('datauristring');
      return NextResponse.json({
        success: true,
        data: base64,
        filename: finalFilename,
        contentType: 'application/pdf',
      });
    }

    if (returnAs === 'buffer') {
      const buffer = pdfDoc.output('arraybuffer');
      return NextResponse.json({
        success: true,
        data: Buffer.from(buffer).toString('base64'),
        filename: finalFilename,
        contentType: 'application/pdf',
      });
    }

    // Default: return as blob (binary response)
    const pdfBuffer = pdfDoc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/export-pdf
 * Get API information
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/reports/export-pdf',
    methods: ['POST'],
    description: 'Generate and export PDF reports',
    supportedReportTypes: [
      'individual-investor',
      'portfolio-performance',
      'agent-performance',
      'agent-comparison',
    ],
    usage: {
      method: 'POST',
      body: {
        reportType: 'string (required)',
        data: 'object (report-specific data)',
        allocationState: 'object (for allocation-based reports)',
        allocationOutputs: 'object (for allocation-based reports)',
        investorName: 'string (for individual investor reports)',
        filename: 'string (optional)',
        returnAs: '"blob" | "base64" | "buffer" (default: "blob")',
      },
    },
    examples: {
      individualInvestor: {
        reportType: 'individual-investor',
        investorName: 'John Doe',
        allocationState: '{ ... }',
        allocationOutputs: '{ ... }',
      },
      portfolioPerformance: {
        reportType: 'portfolio-performance',
        allocationState: '{ ... }',
        allocationOutputs: '{ ... }',
      },
      agentPerformance: {
        reportType: 'agent-performance',
        data: {
          agentName: 'GPT-4 Trader',
          window: { start: '2024-01-01', end: '2024-12-31' },
          totalTrades: 100,
          profitableTrades: 65,
          totalProfit: 50000,
          winRate: 65,
          averageReturn: 5.2,
          trades: [],
          performance: {
            bestTrade: 5000,
            worstTrade: -2000,
            averageHoldTime: '2.5 days',
          },
        },
      },
    },
  });
}
