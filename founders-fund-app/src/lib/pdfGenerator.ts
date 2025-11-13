/**
 * PDF Generation Service
 * Handles PDF creation for all report types using jsPDF and jspdf-autotable
 * Supports Individual Investor, Portfolio Performance, Agent Performance, and Agent Comparison reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AllocationOutputs, AllocationState } from '@/types/allocation';

// Brand colors and styling
const BRAND_COLORS = {
  primary: '#2563eb', // Blue
  secondary: '#16a34a', // Green
  danger: '#dc2626', // Red
  warning: '#f59e0b', // Amber
  muted: '#6b7280', // Gray
  background: '#f9fafb', // Light gray
  text: '#111827', // Dark gray
};

const FONTS = {
  title: { size: 20, style: 'bold' },
  heading: { size: 14, style: 'bold' },
  subheading: { size: 12, style: 'bold' },
  body: { size: 10, style: 'normal' },
  small: { size: 8, style: 'normal' },
};

export interface PDFGeneratorOptions {
  includeCharts?: boolean;
  includeLogo?: boolean;
  includePageNumbers?: boolean;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
}

export interface IndividualInvestorReportData {
  investorName: string;
  window: {
    start: string;
    end: string;
  };
  contributions: Array<{
    date: string;
    amount: number;
    type: string;
  }>;
  dollarDays: number;
  sharePercent: number;
  realizedGross: number;
  realizedNet: number;
  managementFee: number;
  moonbag: number;
  endCapital: number;
  entryFees: number;
  totalContributed: number;
  roi: number;
}

export interface PortfolioPerformanceReportData {
  window: {
    start: string;
    end: string;
  };
  totalProfit: number;
  realizedProfit: number;
  unrealizedProfit: number;
  walletSize: number;
  totalDollarDays: number;
  participants: Array<{
    name: string;
    type: 'founders' | 'investor';
    dollarDays: number;
    share: number;
    realizedNet: number;
    moonbag: number;
    endCapital: number;
  }>;
  feeStructure: {
    entryFeeRate: number;
    mgmtFeeRate: number;
    totalMgmtFees: number;
  };
}

export interface AgentPerformanceReportData {
  agentName: string;
  window: {
    start: string;
    end: string;
  };
  totalTrades: number;
  profitableTrades: number;
  totalProfit: number;
  winRate: number;
  averageReturn: number;
  trades: Array<{
    date: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    amount: number;
    price: number;
    profit?: number;
  }>;
  performance: {
    bestTrade: number;
    worstTrade: number;
    averageHoldTime: string;
  };
}

export interface AgentComparisonReportData {
  window: {
    start: string;
    end: string;
  };
  agents: Array<{
    name: string;
    totalProfit: number;
    winRate: number;
    totalTrades: number;
    avgReturn: number;
    sharpeRatio?: number;
  }>;
  summary: {
    bestPerformer: string;
    worstPerformer: string;
    totalSystemProfit: number;
    avgSystemWinRate: number;
  };
}

export class PDFGenerator {
  private doc: jsPDF;
  private currentY: number;
  private pageHeight: number;
  private pageWidth: number;
  private margin: number;

  constructor(options: PDFGeneratorOptions = {}) {
    const orientation = options.orientation || 'portrait';
    const format = options.format || 'letter';

    this.doc = new jsPDF({
      orientation,
      unit: 'pt',
      format,
    });

    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    this.margin = 40;
    this.currentY = this.margin;
  }

  /**
   * Add header with logo and branding
   */
  private addHeader(title: string, subtitle?: string): void {
    // Add title
    this.doc.setFontSize(FONTS.title.size);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(BRAND_COLORS.primary);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 25;

    // Add subtitle if provided
    if (subtitle) {
      this.doc.setFontSize(FONTS.body.size);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(BRAND_COLORS.muted);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.currentY += 20;
    }

    // Add separator line
    this.doc.setDrawColor(BRAND_COLORS.muted);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;
  }

  /**
   * Add footer with page numbers and timestamp
   */
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);

      // Add page number
      this.doc.setFontSize(FONTS.small.size);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(BRAND_COLORS.muted);
      const pageText = `Page ${i} of ${pageCount}`;
      this.doc.text(pageText, this.pageWidth / 2, this.pageHeight - 20, { align: 'center' });

      // Add timestamp
      const timestamp = new Date().toLocaleString();
      this.doc.text(`Generated: ${timestamp}`, this.margin, this.pageHeight - 20);

      // Add branding
      this.doc.text('Founders Fund AI Trading Platform', this.pageWidth - this.margin, this.pageHeight - 20, { align: 'right' });
    }
  }

  /**
   * Add a section heading
   */
  private addSectionHeading(text: string): void {
    this.checkPageBreak(30);
    this.doc.setFontSize(FONTS.heading.size);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(BRAND_COLORS.text);
    this.doc.text(text, this.margin, this.currentY);
    this.currentY += 20;
  }

  /**
   * Add key-value pair
   */
  private addKeyValue(key: string, value: string, color?: string): void {
    this.checkPageBreak(15);
    this.doc.setFontSize(FONTS.body.size);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(BRAND_COLORS.text);
    this.doc.text(`${key}:`, this.margin, this.currentY);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(color || BRAND_COLORS.text);
    this.doc.text(value, this.margin + 150, this.currentY);
    this.currentY += 15;
  }

  /**
   * Check if we need a page break
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 60) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  private formatPercent(percent: number): string {
    return `${percent.toFixed(2)}%`;
  }

  /**
   * Generate Individual Investor Report (Privacy-safe)
   */
  generateIndividualInvestorReport(data: IndividualInvestorReportData): jsPDF {
    this.addHeader(
      'Individual Investor Report',
      `Privacy-Protected Report for ${data.investorName}`
    );

    // Report Period
    this.addSectionHeading('Report Period');
    this.addKeyValue('Start Date', data.window.start);
    this.addKeyValue('End Date', data.window.end);
    this.currentY += 10;

    // Performance Summary
    this.addSectionHeading('Performance Summary');
    this.addKeyValue('Total Contributed', this.formatCurrency(data.totalContributed));
    this.addKeyValue('Entry Fees Paid', this.formatCurrency(data.entryFees), BRAND_COLORS.danger);
    this.addKeyValue('Dollar-Days Accumulated', data.dollarDays.toLocaleString());
    this.addKeyValue('Portfolio Share', this.formatPercent(data.sharePercent), BRAND_COLORS.primary);
    this.currentY += 10;

    // Returns
    this.addSectionHeading('Returns & Allocation');
    this.addKeyValue('Realized Gross', this.formatCurrency(data.realizedGross));
    this.addKeyValue('Management Fee', this.formatCurrency(data.managementFee), BRAND_COLORS.danger);
    this.addKeyValue('Realized Net', this.formatCurrency(data.realizedNet),
      data.realizedNet >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.addKeyValue('Unrealized (Moonbag)', this.formatCurrency(data.moonbag), BRAND_COLORS.warning);
    this.addKeyValue('End Capital', this.formatCurrency(data.endCapital), BRAND_COLORS.primary);
    this.addKeyValue('ROI', this.formatPercent(data.roi),
      data.roi >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.currentY += 10;

    // Contributions Table
    this.addSectionHeading('Contribution History');
    if (data.contributions.length > 0) {
      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Date', 'Type', 'Amount']],
        body: data.contributions.map(c => [
          c.date,
          c.type,
          this.formatCurrency(c.amount)
        ]),
        theme: 'grid',
        headStyles: { fillColor: BRAND_COLORS.primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: BRAND_COLORS.background },
        margin: { left: this.margin, right: this.margin },
      });
      this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
    } else {
      this.doc.setFontSize(FONTS.body.size);
      this.doc.setTextColor(BRAND_COLORS.muted);
      this.doc.text('No contributions recorded for this period.', this.margin, this.currentY);
      this.currentY += 20;
    }

    // Privacy Notice
    this.addSectionHeading('Privacy Notice');
    this.doc.setFontSize(FONTS.small.size);
    this.doc.setTextColor(BRAND_COLORS.muted);
    const privacyText = 'This report contains only your investment data. Information about other investors is not included to maintain privacy.';
    const splitText = this.doc.splitTextToSize(privacyText, this.pageWidth - (this.margin * 2));
    this.doc.text(splitText, this.margin, this.currentY);

    this.addFooter();
    return this.doc;
  }

  /**
   * Generate Portfolio Performance Report
   */
  generatePortfolioPerformanceReport(data: PortfolioPerformanceReportData): jsPDF {
    this.addHeader(
      'Portfolio Performance Report',
      `Period: ${data.window.start} to ${data.window.end}`
    );

    // Overall Performance
    this.addSectionHeading('Overall Performance');
    this.addKeyValue('Total Profit', this.formatCurrency(data.totalProfit),
      data.totalProfit >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.addKeyValue('Realized Profit', this.formatCurrency(data.realizedProfit), BRAND_COLORS.secondary);
    this.addKeyValue('Unrealized Profit', this.formatCurrency(data.unrealizedProfit), BRAND_COLORS.warning);
    this.addKeyValue('Wallet Size', this.formatCurrency(data.walletSize));
    this.addKeyValue('Total Dollar-Days', data.totalDollarDays.toLocaleString());
    this.currentY += 10;

    // Fee Structure
    this.addSectionHeading('Fee Structure');
    this.addKeyValue('Entry Fee Rate', this.formatPercent(data.feeStructure.entryFeeRate * 100));
    this.addKeyValue('Management Fee Rate', this.formatPercent(data.feeStructure.mgmtFeeRate * 100));
    this.addKeyValue('Total Management Fees', this.formatCurrency(data.feeStructure.totalMgmtFees), BRAND_COLORS.secondary);
    this.currentY += 10;

    // Participants Table
    this.addSectionHeading('Participant Breakdown');
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Name', 'Type', 'Dollar-Days', 'Share %', 'Realized Net', 'Moonbag', 'End Capital']],
      body: data.participants.map(p => [
        p.name,
        p.type.toUpperCase(),
        p.dollarDays.toLocaleString(),
        this.formatPercent(p.share),
        this.formatCurrency(p.realizedNet),
        this.formatCurrency(p.moonbag),
        this.formatCurrency(p.endCapital)
      ]),
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLORS.primary, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: BRAND_COLORS.background },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60 },
        2: { cellWidth: 80, halign: 'right' },
        3: { cellWidth: 50, halign: 'right' },
        4: { cellWidth: 80, halign: 'right' },
        5: { cellWidth: 80, halign: 'right' },
        6: { cellWidth: 80, halign: 'right' },
      },
    });
    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;

    // Summary Stats
    this.addSectionHeading('Summary Statistics');
    this.addKeyValue('Total Participants', data.participants.length.toString());
    const foundersCount = data.participants.filter(p => p.type === 'founders').length;
    const investorsCount = data.participants.filter(p => p.type === 'investor').length;
    this.addKeyValue('Founders', foundersCount.toString());
    this.addKeyValue('Investors', investorsCount.toString());

    this.addFooter();
    return this.doc;
  }

  /**
   * Generate Agent Performance Report
   */
  generateAgentPerformanceReport(data: AgentPerformanceReportData): jsPDF {
    this.addHeader(
      `Agent Performance Report: ${data.agentName}`,
      `Period: ${data.window.start} to ${data.window.end}`
    );

    // Performance Metrics
    this.addSectionHeading('Performance Metrics');
    this.addKeyValue('Total Trades', data.totalTrades.toString());
    this.addKeyValue('Profitable Trades', data.profitableTrades.toString(), BRAND_COLORS.secondary);
    this.addKeyValue('Win Rate', this.formatPercent(data.winRate),
      data.winRate >= 50 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.addKeyValue('Total Profit', this.formatCurrency(data.totalProfit),
      data.totalProfit >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.addKeyValue('Average Return', this.formatPercent(data.averageReturn),
      data.averageReturn >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.currentY += 10;

    // Performance Details
    this.addSectionHeading('Performance Details');
    this.addKeyValue('Best Trade', this.formatCurrency(data.performance.bestTrade), BRAND_COLORS.secondary);
    this.addKeyValue('Worst Trade', this.formatCurrency(data.performance.worstTrade), BRAND_COLORS.danger);
    this.addKeyValue('Average Hold Time', data.performance.averageHoldTime);
    this.currentY += 10;

    // Trade History
    this.addSectionHeading('Recent Trade History');
    if (data.trades.length > 0) {
      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Date', 'Symbol', 'Type', 'Amount', 'Price', 'Profit']],
        body: data.trades.slice(0, 20).map(t => [
          t.date,
          t.symbol,
          t.type,
          t.amount.toFixed(4),
          this.formatCurrency(t.price),
          t.profit ? this.formatCurrency(t.profit) : '-'
        ]),
        theme: 'grid',
        headStyles: { fillColor: BRAND_COLORS.primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: BRAND_COLORS.background },
        margin: { left: this.margin, right: this.margin },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
      });
      this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
    }

    this.addFooter();
    return this.doc;
  }

  /**
   * Generate Agent Comparison Report
   */
  generateAgentComparisonReport(data: AgentComparisonReportData): jsPDF {
    this.addHeader(
      'Agent Comparison Report',
      `Period: ${data.window.start} to ${data.window.end}`
    );

    // Summary
    this.addSectionHeading('Portfolio Summary');
    this.addKeyValue('Best Performer', data.summary.bestPerformer, BRAND_COLORS.secondary);
    this.addKeyValue('Worst Performer', data.summary.worstPerformer, BRAND_COLORS.danger);
    this.addKeyValue('Total System Profit', this.formatCurrency(data.summary.totalSystemProfit),
      data.summary.totalSystemProfit >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.addKeyValue('Average Win Rate', this.formatPercent(data.summary.avgSystemWinRate));
    this.currentY += 10;

    // Agent Comparison Table
    this.addSectionHeading('Agent Performance Comparison');
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Agent Name', 'Total Profit', 'Win Rate', 'Total Trades', 'Avg Return', 'Sharpe Ratio']],
      body: data.agents.map(a => [
        a.name,
        this.formatCurrency(a.totalProfit),
        this.formatPercent(a.winRate),
        a.totalTrades.toString(),
        this.formatPercent(a.avgReturn),
        a.sharpeRatio ? a.sharpeRatio.toFixed(2) : 'N/A'
      ]),
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLORS.primary, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: BRAND_COLORS.background },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });
    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;

    // Rankings
    this.addSectionHeading('Performance Rankings');
    const sortedByProfit = [...data.agents].sort((a, b) => b.totalProfit - a.totalProfit);

    this.doc.setFontSize(FONTS.body.size);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('By Total Profit:', this.margin, this.currentY);
    this.currentY += 15;

    sortedByProfit.forEach((agent, idx) => {
      this.checkPageBreak(15);
      this.doc.setFont('helvetica', 'normal');
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      this.doc.text(`${medal} ${agent.name}: ${this.formatCurrency(agent.totalProfit)}`, this.margin + 10, this.currentY);
      this.currentY += 15;
    });

    this.addFooter();
    return this.doc;
  }

  /**
   * Save PDF to file
   */
  save(filename: string): void {
    this.doc.save(filename);
  }

  /**
   * Get PDF as blob
   */
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  /**
   * Get PDF as base64 string
   */
  getBase64(): string {
    return this.doc.output('datauristring');
  }

  /**
   * Get PDF as buffer
   */
  getBuffer(): ArrayBuffer {
    return this.doc.output('arraybuffer');
  }

  /**
   * Add image to PDF from data URL or base64
   */
  addImage(
    imageData: string,
    format: 'PNG' | 'JPEG' | 'JPG',
    x: number,
    y: number,
    width: number,
    height: number,
    alias?: string,
    compression?: 'NONE' | 'FAST' | 'MEDIUM' | 'SLOW'
  ): void {
    this.checkPageBreak(height + 20);
    try {
      this.doc.addImage(imageData, format, x, y, width, height, alias, compression || 'FAST');
      this.currentY = y + height + 10;
    } catch (error) {
      console.error('Failed to add image to PDF:', error);
      // Add error placeholder
      this.doc.setFontSize(FONTS.small.size);
      this.doc.setTextColor(BRAND_COLORS.danger);
      this.doc.text('[Chart Image Error]', x, y);
      this.currentY = y + 20;
    }
  }

  /**
   * Add chart image with title
   */
  addChartImage(
    title: string,
    imageData: string,
    format: 'PNG' | 'JPEG' = 'PNG',
    options: {
      width?: number;
      height?: number;
      centerHorizontally?: boolean;
    } = {}
  ): void {
    const {
      width = this.pageWidth - this.margin * 2,
      height = 300,
      centerHorizontally = true,
    } = options;

    this.addSectionHeading(title);

    const x = centerHorizontally
      ? (this.pageWidth - width) / 2
      : this.margin;

    this.addImage(imageData, format, x, this.currentY, width, height);
  }

  /**
   * Add table of contents
   */
  addTableOfContents(sections: Array<{ title: string; page: number }>): void {
    this.addSectionHeading('Table of Contents');

    sections.forEach((section) => {
      this.checkPageBreak(20);
      this.doc.setFontSize(FONTS.body.size);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(BRAND_COLORS.text);

      // Draw section title
      this.doc.text(section.title, this.margin, this.currentY);

      // Draw dots
      const dotsY = this.currentY;
      const titleWidth = this.doc.getTextWidth(section.title);
      const pageNumWidth = this.doc.getTextWidth(`${section.page}`);
      const dotsWidth = this.pageWidth - this.margin * 2 - titleWidth - pageNumWidth - 10;

      this.doc.setTextColor(BRAND_COLORS.muted);
      const dotCount = Math.floor(dotsWidth / 5);
      const dots = '.'.repeat(dotCount);
      this.doc.text(dots, this.margin + titleWidth + 5, dotsY);

      // Draw page number
      this.doc.text(`${section.page}`, this.pageWidth - this.margin - pageNumWidth, dotsY);

      this.currentY += 20;
    });

    this.currentY += 10;
  }

  /**
   * Add watermark to all pages
   */
  addWatermark(text: string, options: { opacity?: number; angle?: number } = {}): void {
    const { opacity = 0.1, angle = -45 } = options;
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.saveGraphicsState();
      this.doc.setGState(new (this.doc as any).GState({ opacity }));
      this.doc.setFontSize(60);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(BRAND_COLORS.muted);

      // Center the text and rotate
      // const textWidth = this.doc.getTextWidth(text); // Reserved for future use
      const x = this.pageWidth / 2;
      const y = this.pageHeight / 2;

      this.doc.text(text, x, y, {
        align: 'center',
        angle,
      });

      this.doc.restoreGraphicsState();
    }
  }

  /**
   * Generate Trade History Report
   */
  generateTradeHistoryReport(data: {
    title: string;
    window: { start: string; end: string };
    trades: Array<{
      date: string;
      agentName?: string;
      symbol: string;
      type: 'BUY' | 'SELL';
      amount: number;
      price: number;
      value: number;
      fees: number;
      profit?: number;
    }>;
    summary: {
      totalTrades: number;
      totalVolume: number;
      totalFees: number;
      totalProfit: number;
      profitableTrades: number;
      losingTrades: number;
    };
  }): jsPDF {
    this.addHeader(data.title, `Period: ${data.window.start} to ${data.window.end}`);

    // Summary
    this.addSectionHeading('Trade Summary');
    this.addKeyValue('Total Trades', data.summary.totalTrades.toString());
    this.addKeyValue('Total Volume', this.formatCurrency(data.summary.totalVolume));
    this.addKeyValue('Total Fees', this.formatCurrency(data.summary.totalFees), BRAND_COLORS.danger);
    this.addKeyValue('Total Profit/Loss', this.formatCurrency(data.summary.totalProfit),
      data.summary.totalProfit >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.addKeyValue('Profitable Trades', `${data.summary.profitableTrades} (${((data.summary.profitableTrades / data.summary.totalTrades) * 100).toFixed(1)}%)`, BRAND_COLORS.secondary);
    this.addKeyValue('Losing Trades', `${data.summary.losingTrades} (${((data.summary.losingTrades / data.summary.totalTrades) * 100).toFixed(1)}%)`, BRAND_COLORS.danger);
    this.currentY += 10;

    // Trades table
    this.addSectionHeading('Trade History');
    if (data.trades.length > 0) {
      const columns = data.trades[0].agentName
        ? ['Date', 'Agent', 'Symbol', 'Side', 'Amount', 'Price', 'Value', 'Fees', 'P&L']
        : ['Date', 'Symbol', 'Side', 'Amount', 'Price', 'Value', 'Fees', 'P&L'];

      autoTable(this.doc, {
        startY: this.currentY,
        head: [columns],
        body: data.trades.map(t => {
          const row = [
            t.date,
            ...(t.agentName ? [t.agentName] : []),
            t.symbol,
            t.type,
            t.amount.toFixed(4),
            this.formatCurrency(t.price),
            this.formatCurrency(t.value),
            this.formatCurrency(t.fees),
            t.profit !== undefined ? this.formatCurrency(t.profit) : '-'
          ];
          return row;
        }),
        theme: 'grid',
        headStyles: { fillColor: BRAND_COLORS.primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: BRAND_COLORS.background },
        margin: { left: this.margin, right: this.margin },
        styles: { fontSize: 8 },
        columnStyles: {
          [columns.length - 5]: { halign: 'right' }, // Amount
          [columns.length - 4]: { halign: 'right' }, // Price
          [columns.length - 3]: { halign: 'right' }, // Value
          [columns.length - 2]: { halign: 'right' }, // Fees
          [columns.length - 1]: { halign: 'right' }, // P&L
        },
      });
      this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
    } else {
      this.doc.setFontSize(FONTS.body.size);
      this.doc.setTextColor(BRAND_COLORS.muted);
      this.doc.text('No trades recorded for this period.', this.margin, this.currentY);
      this.currentY += 20;
    }

    this.addFooter();
    return this.doc;
  }

  /**
   * Generate Multi-Agent Consolidated Report
   */
  generateMultiAgentReport(data: {
    title: string;
    window: { start: string; end: string };
    portfolio: {
      totalValue: number;
      totalProfit: number;
      totalTrades: number;
      avgWinRate: number;
    };
    agents: Array<{
      name: string;
      symbol: string;
      allocation: number;
      currentValue: number;
      totalPnl: number;
      winRate: number;
      totalTrades: number;
      status: string;
    }>;
    chartImages?: {
      performanceChart?: string;
      allocationChart?: string;
      comparisonChart?: string;
    };
  }): jsPDF {
    // Cover page
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(BRAND_COLORS.primary);
    this.doc.text(data.title, this.pageWidth / 2, this.pageHeight / 3, { align: 'center' });

    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(BRAND_COLORS.text);
    this.doc.text(`Period: ${data.window.start} to ${data.window.end}`, this.pageWidth / 2, this.pageHeight / 3 + 40, { align: 'center' });

    this.doc.setFontSize(12);
    this.doc.setTextColor(BRAND_COLORS.muted);
    this.doc.text(`Generated: ${new Date().toLocaleString()}`, this.pageWidth / 2, this.pageHeight / 3 + 60, { align: 'center' });
    this.doc.text('Founders Fund AI Trading Platform', this.pageWidth / 2, this.pageHeight / 3 + 80, { align: 'center' });

    // Add watermark
    this.addWatermark(`Generated ${new Date().toLocaleDateString()}`);

    // New page for content
    this.doc.addPage();
    this.currentY = this.margin;

    // Executive Summary
    this.addSectionHeading('Executive Summary');
    this.addKeyValue('Total Portfolio Value', this.formatCurrency(data.portfolio.totalValue), BRAND_COLORS.primary);
    this.addKeyValue('Total Profit/Loss', this.formatCurrency(data.portfolio.totalProfit),
      data.portfolio.totalProfit >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
    this.addKeyValue('Total Trades', data.portfolio.totalTrades.toString());
    this.addKeyValue('Average Win Rate', this.formatPercent(data.portfolio.avgWinRate));
    this.addKeyValue('Active Agents', data.agents.filter(a => a.status === 'ACTIVE').length.toString(), BRAND_COLORS.secondary);
    this.currentY += 10;

    // Add performance chart if available
    if (data.chartImages?.performanceChart) {
      this.addChartImage('Portfolio Performance', data.chartImages.performanceChart);
    }

    // Agent Summary Table
    this.addSectionHeading('Agent Performance Summary');
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Agent', 'Symbol', 'Allocation', 'Current Value', 'P&L', 'Win Rate', 'Trades', 'Status']],
      body: data.agents.map(a => [
        a.name,
        a.symbol,
        this.formatCurrency(a.allocation),
        this.formatCurrency(a.currentValue),
        this.formatCurrency(a.totalPnl),
        this.formatPercent(a.winRate),
        a.totalTrades.toString(),
        a.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: BRAND_COLORS.primary, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: BRAND_COLORS.background },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });
    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;

    // Add comparison chart if available
    if (data.chartImages?.comparisonChart) {
      this.addChartImage('Agent Comparison', data.chartImages.comparisonChart);
    }

    // Detailed agent sections
    this.doc.addPage();
    this.currentY = this.margin;
    this.addSectionHeading('Detailed Agent Analysis');

    data.agents.forEach((agent, index) => {
      if (index > 0 && index % 3 === 0) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.checkPageBreak(100);

      this.doc.setFontSize(FONTS.subheading.size);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(BRAND_COLORS.primary);
      this.doc.text(`${agent.name} (${agent.symbol})`, this.margin, this.currentY);
      this.currentY += 20;

      this.addKeyValue('Allocation', this.formatCurrency(agent.allocation));
      this.addKeyValue('Current Value', this.formatCurrency(agent.currentValue));
      this.addKeyValue('Total P&L', this.formatCurrency(agent.totalPnl),
        agent.totalPnl >= 0 ? BRAND_COLORS.secondary : BRAND_COLORS.danger);
      this.addKeyValue('Win Rate', this.formatPercent(agent.winRate));
      this.addKeyValue('Total Trades', agent.totalTrades.toString());
      this.addKeyValue('Status', agent.status,
        agent.status === 'ACTIVE' ? BRAND_COLORS.secondary : BRAND_COLORS.muted);
      this.currentY += 15;
    });

    this.addFooter();
    return this.doc;
  }
}

/**
 * Helper function to generate Individual Investor Report from allocation data
 */
export function generateIndividualInvestorReportFromAllocation(
  investorName: string,
  state: AllocationState,
  outputs: AllocationOutputs
): jsPDF {
  // Extract investor-specific data
  const investorContributions = state.contributions.filter(
    leg => leg.owner === 'investor' && leg.name === investorName
  );

  const totalContributed = investorContributions
    .filter(leg => leg.type === 'investor_contribution')
    .reduce((sum, leg) => sum + leg.amount, 0);

  const entryFees = investorContributions
    .filter(leg => leg.type === 'founders_entry_fee')
    .reduce((sum, leg) => sum + Math.abs(leg.amount), 0);

  const dollarDays = outputs.dollarDays.investors[investorName] || 0;
  const sharePercent = (outputs.shares.investors[investorName] || 0) * 100;
  const realizedGross = outputs.realizedGross.investors[investorName] || 0;
  const realizedNet = outputs.realizedNet.investors[investorName] || 0;
  const managementFee = outputs.managementFees.investors[investorName] || 0;
  const moonbag = outputs.moonbag.investors[investorName] || 0;
  const endCapital = outputs.endCapital.investors[investorName] || 0;

  const roi = totalContributed > 0 ? ((realizedNet / totalContributed) * 100) : 0;

  const reportData: IndividualInvestorReportData = {
    investorName,
    window: state.window,
    contributions: investorContributions.map(leg => ({
      date: leg.ts,
      amount: leg.amount,
      type: leg.type,
    })),
    dollarDays,
    sharePercent,
    realizedGross,
    realizedNet,
    managementFee,
    moonbag,
    endCapital,
    entryFees,
    totalContributed,
    roi,
  };

  const generator = new PDFGenerator();
  return generator.generateIndividualInvestorReport(reportData);
}

/**
 * Helper function to generate Portfolio Performance Report from allocation data
 */
export function generatePortfolioReportFromAllocation(
  state: AllocationState,
  outputs: AllocationOutputs
): jsPDF {
  const participants: PortfolioPerformanceReportData['participants'] = [];

  // Add founders
  if (outputs.dollarDays.founders > 0) {
    participants.push({
      name: 'Founders',
      type: 'founders',
      dollarDays: outputs.dollarDays.founders,
      share: outputs.shares.founders * 100,
      realizedNet: outputs.realizedNet.founders,
      moonbag: outputs.moonbag.founders,
      endCapital: outputs.endCapital.founders,
    });
  }

  // Add investors
  Object.entries(outputs.dollarDays.investors).forEach(([name, dollarDays]) => {
    if (dollarDays > 0) {
      participants.push({
        name,
        type: 'investor',
        dollarDays,
        share: (outputs.shares.investors[name] || 0) * 100,
        realizedNet: outputs.realizedNet.investors[name] || 0,
        moonbag: outputs.moonbag.investors[name] || 0,
        endCapital: outputs.endCapital.investors[name] || 0,
      });
    }
  });

  const totalMgmtFees = outputs.managementFees.foundersCarryTotal;

  const reportData: PortfolioPerformanceReportData = {
    window: state.window,
    totalProfit: outputs.profitTotal,
    realizedProfit: outputs.realizedProfit,
    unrealizedProfit: outputs.profitTotal - outputs.realizedProfit,
    walletSize: state.walletSizeEndOfWindow,
    totalDollarDays: outputs.dollarDays.total,
    participants,
    feeStructure: {
      entryFeeRate: state.constants.ENTRY_FEE_RATE,
      mgmtFeeRate: state.constants.MGMT_FEE_RATE,
      totalMgmtFees,
    },
  };

  const generator = new PDFGenerator();
  return generator.generatePortfolioPerformanceReport(reportData);
}
