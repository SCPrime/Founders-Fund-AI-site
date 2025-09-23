export type LegType =
  | 'seed'
  | 'investor_contribution'
  | 'founders_entry_fee'
  | 'founders_mgmt_fee'
  | 'moonbag_founders'
  | 'moonbag_investor'
  | 'draw';

export type Owner = 'founders' | 'investor';

export interface CashflowLeg {
  id: string;
  owner: Owner;
  name: string; // investor name if owner='investor'; 'Founders' otherwise
  type: LegType;
  amount: number; // positive for inflow, negative for draw
  ts: string; // ISO date string
  earnsDollarDaysThisWindow: boolean;
}

export interface Window {
  start: string; // ISO date (inclusive)
  end: string; // ISO date (inclusive)
}

export interface AllocationConstants {
  INVESTOR_SEED_BASELINE: number; // 20,000
  ENTRY_FEE_RATE: number; // 0.10
  MGMT_FEE_RATE: number; // 0.20
  FOUNDERS_MOONBAG_PCT: number; // 0.75
  FOUNDERS_COUNT: number; // 2
  ENTRY_FEE_REDUCES_INVESTOR_CREDIT: boolean; // true
}

export interface AllocationState {
  window: Window;
  walletSizeEndOfWindow: number;
  unrealizedPnlEndOfWindow: number;
  contributions: CashflowLeg[];
  constants: AllocationConstants;
}

export interface DollarDaysMap {
  founders: number;
  investors: Record<string, number>; // investor name -> dollar-days
  total: number;
}

export interface SharesMap {
  founders: number;
  investors: Record<string, number>; // investor name -> share (0-1)
}

export interface RealizedAllocation {
  founders: number;
  investors: Record<string, number>; // investor name -> amount
}

export interface ManagementFees {
  investors: Record<string, number>; // investor name -> fee amount
  foundersCarryTotal: number;
}

export interface MoonbagAllocation {
  founders: number;
  investors: Record<string, number>; // investor name -> moonbag amount
}

export interface EndCapital {
  founders: number;
  investors: Record<string, number>; // investor name -> end capital
}

export interface AllocationOutputs {
  profitTotal: number;
  realizedProfit: number;
  dollarDays: DollarDaysMap;
  shares: SharesMap;
  realizedGross: RealizedAllocation;
  realizedNet: RealizedAllocation;
  managementFees: ManagementFees;
  moonbag: MoonbagAllocation;
  foundersMgmtLeg: CashflowLeg | null;
  moonbagLegs: CashflowLeg[];
  endCapital: EndCapital;
  expandedLegs: CashflowLeg[];
}

export interface TrendRow {
  window: Window;
  walletSizeEnd: number;
  profitTotal: number;
  unrealized: number;
  realized: number;
  dollarDays: DollarDaysMap;
  shares: SharesMap;
  realizedNet: RealizedAllocation;
  managementFees: ManagementFees;
  moonbag: MoonbagAllocation;
  timestamp: string;
}

export interface ValidationError {
  type: 'error' | 'warning';
  field: string;
  message: string;
  expected?: number;
  actual?: number;
}

export interface AllocationSnapshot {
  id: string;
  timestamp: string;
  state: AllocationState;
  outputs: AllocationOutputs;
  trendRow: TrendRow;
  validationErrors: ValidationError[];
}