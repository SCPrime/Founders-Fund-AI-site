/**
 * Report Data Types
 * Centralized type definitions for all report data structures
 */

import type { AllocationOutputs, AllocationState } from './allocation';

// Base report data structure
export interface BaseReportData {
  title?: string;
  subtitle?: string;
  generatedAt?: string;
  metadata?: Record<string, unknown>;
}

// Individual Investor Report Data
export interface IndividualInvestorReportData extends BaseReportData {
  investorName: string;
  allocationState?: AllocationState;
  allocationOutputs?: AllocationOutputs;
  contributions?: Array<{
    date: string;
    amount: number;
    type: string;
  }>;
  performance?: {
    totalReturn: number;
    realizedProfit: number;
    unrealizedProfit: number;
  };
}

// Portfolio Performance Report Data
export interface PortfolioPerformanceReportData extends BaseReportData {
  portfolioId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalValue: number;
    totalReturn: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
  };
  allocations?: AllocationOutputs;
}

// Agent Performance Report Data
export interface AgentPerformanceReportData extends BaseReportData {
  agentId: string;
  agentName: string;
  period: {
    start: string;
    end: string;
  };
  performance: {
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    sharpeRatio?: number;
  };
  trades?: Array<{
    id: string;
    timestamp: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    pnl?: number;
  }>;
}

// Multi-Agent Comparison Report Data
export interface MultiAgentReportData extends BaseReportData {
  agents: Array<{
    agentId: string;
    agentName: string;
    performance: {
      totalPnl: number;
      winRate: number;
      totalTrades: number;
    };
  }>;
  comparison: {
    bestPerformer?: string;
    averageWinRate: number;
    totalTrades: number;
  };
}

// Trade History Report Data
export interface TradeHistoryReportData extends BaseReportData {
  trades: Array<{
    id: string;
    timestamp: string;
    agentId?: string;
    agentName?: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    amount: number;
    price: number;
    fees?: number;
    pnl?: number;
  }>;
  summary: {
    totalTrades: number;
    totalVolume: number;
    totalFees: number;
    netPnl: number;
  };
}

// Union type for all report data
export type ReportData =
  | IndividualInvestorReportData
  | PortfolioPerformanceReportData
  | AgentPerformanceReportData
  | MultiAgentReportData
  | TradeHistoryReportData
  | BaseReportData;

// Report preview section structure
export interface ReportPreviewSection {
  title: string;
  items: Array<{
    label: string;
    value: string | number;
    format?: 'currency' | 'percentage' | 'number' | 'date';
  }>;
}

export interface ReportPreviewData {
  title: string;
  subtitle?: string;
  sections?: ReportPreviewSection[];
  metadata?: {
    pageCount?: number;
    [key: string]: unknown;
  };
}

// Export request body types
export interface ExportPDFRequestBody {
  reportType:
    | 'individual-investor'
    | 'portfolio-performance'
    | 'agent-performance'
    | 'agent-comparison';
  filename?: string;
  data?: ReportData;
  allocationState?: AllocationState;
  allocationOutputs?: AllocationOutputs;
  investorName?: string;
}

// Report metadata type (for ExportHistory)
export interface ReportMetadata {
  reportType: string;
  portfolioId?: string;
  agentId?: string;
  investorName?: string;
  period?: {
    start: string;
    end: string;
  };
  [key: string]: unknown;
}
