// Core types for Founders Fund Calculator

export type ContributionClass = 'founder' | 'investor';
export type ContributionRule = 'net' | 'gross';
export type ViewMode = 'week' | 'max';

export interface Contribution {
  id: string;
  name: string;
  date: string; // ISO date string
  amount: number;
  rule: ContributionRule;
  cls: ContributionClass;
}

export interface FundSettings {
  // Time window
  view: ViewMode;
  winStart: string; // ISO date string
  winEnd: string; // ISO date string

  // Financial values
  walletSize: number;
  realizedProfit: number;
  moonbagReal: number;
  moonbagUnreal: number;
  includeUnreal: 'yes' | 'no';

  // Fee structure
  moonbagFounderPct: number; // Default 75%
  mgmtFeePct: number; // Default 20%
  entryFeePct: number; // Default 10%
  feeReducesInvestor: 'yes' | 'no'; // Does entry fee reduce credited capital

  // Founder-specific
  founderCount: number;
  drawPerFounder: number;
  applyDraws: 'yes' | 'no';

  // Advanced
  domLeadPct: number; // Dominant lead fee percentage
}

export interface CalculatedResult {
  id: string;
  name: string;
  cls: ContributionClass;

  // Capital tracking
  startCapital: number;
  contributions: number;
  endCapital: number;

  // Time-weighted calculations
  dollarDays: number;
  twShare: number; // Time-weighted share percentage

  // Profit distribution
  baseProfitShare: number;
  regularFee: number; // Combined mgmt + entry fees (+ for receiving, - for paying)
  moonbag: number;
  draws: number;
  netProfit: number;

  // Performance metrics
  pgp: number; // Period Gross Profit percentage
}

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
  quickFix?: () => void;
  quickFixLabel?: string;
}

export interface CalculationSummary {
  totalContributions: number;
  totalDollarDays: number;
  totalBaseProfitShare: number;
  totalFees: number;
  totalNetProfit: number;
  windowDays: number;

  // Fee breakdowns
  totalMgmtFeesCollected: number;
  totalEntryFeesCollected: number;
  totalMoonbagDistributed: number;
  totalDraws: number;
}

export interface FundSnapshot {
  contributions: Contribution[];
  settings: FundSettings;
  results: CalculatedResult[];
  summary: CalculationSummary;
  validationIssues: ValidationIssue[];
  lastCalculated: Date;
}