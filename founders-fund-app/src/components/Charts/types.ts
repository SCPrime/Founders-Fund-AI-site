// Chart types and interfaces for technical analysis
import { Time } from 'lightweight-charts';

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LineData {
  time: Time;
  value: number;
}

export interface HistogramData {
  time: Time;
  value: number;
  color?: string;
}

export interface IchimokuData {
  tenkan: LineData[];
  kijun: LineData[];
  senkouA: LineData[];
  senkouB: LineData[];
  chikou: LineData[];
}

export interface MACDData {
  macd: HistogramData[];
  signal: LineData[];
  histogram: HistogramData[];
}

export interface BollingerBandsData {
  upper: LineData[];
  middle: LineData[];
  lower: LineData[];
}

export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface IndicatorConfig {
  id: string;
  name: string;
  enabled: boolean;
  params?: Record<string, number>;
}

export interface DrawingTool {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical' | 'fibonacci' | 'rectangle' | 'text' | 'arrow';
  points: Array<{ time: Time; value: number }>;
  style?: {
    color?: string;
    lineWidth?: number;
    lineStyle?: number;
  };
  text?: string;
}

export interface ChartTheme {
  background: string;
  textColor: string;
  gridColor: string;
  crosshairColor: string;
  upColor: string;
  downColor: string;
}

export interface PortfolioDataPoint {
  timestamp: string;
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  agentValues?: Record<string, number>;
}

export interface AgentPerformanceData {
  agentId: string;
  agentName: string;
  data: Array<{
    timestamp: string;
    value: number;
    pnl: number;
  }>;
}

export interface FinancialMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  alpha: number;
  beta: number;
  volatility: number;
  totalReturn: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
}
