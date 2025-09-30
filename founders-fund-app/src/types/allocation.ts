/**
 * Enum for different types of cashflow legs
 * Mirrors Prisma enum for consistency in database operations
 */
export enum LegType {
  SEED = 'seed',
  INVESTOR_CONTRIBUTION = 'investor_contribution',
  FOUNDERS_ENTRY_FEE = 'founders_entry_fee',
  FOUNDERS_MGMT_FEE = 'founders_mgmt_fee',
  MOONBAG_FOUNDERS = 'moonbag_founders',
  MOONBAG_INVESTOR = 'moonbag_investor',
  DRAW = 'draw'
}

/**
 * Legacy type alias for backwards compatibility
 * @deprecated Use LegType enum instead
 */
export type LegTypeUnion =
  | 'seed'
  | 'investor_contribution'
  | 'founders_entry_fee'
  | 'founders_mgmt_fee'
  | 'moonbag_founders'
  | 'moonbag_investor'
  | 'draw';

/**
 * Enum for cashflow leg ownership
 */
export enum Owner {
  FOUNDERS = 'founders',
  INVESTOR = 'investor'
}

/**
 * Legacy type alias for backwards compatibility
 * @deprecated Use Owner enum instead
 */
export type OwnerUnion = 'founders' | 'investor';

export interface CashflowLeg {
  id?: string;
  owner: Owner | OwnerUnion; // Support both enum and legacy string union
  name: string; // investor name if owner='investor'; 'Founders' otherwise
  type: LegType | LegTypeUnion; // Support both enum and legacy string union
  amount: number; // positive for inflow, negative for draw
  ts: string; // ISO date string (YYYY-MM-DD format)
  earnsDollarDaysThisWindow: boolean;
}

/**
 * Type alias for CashflowLeg - used in fees.ts and other utilities
 */
export type Leg = CashflowLeg;

/**
 * Time window for allocation calculations
 */
export interface Window {
  /** Start date in ISO format YYYY-MM-DD (inclusive) */
  start: string;
  /** End date in ISO format YYYY-MM-DD (inclusive) */
  end: string;
  /** Optional label for the window (e.g., "Q1 2025", "Weekly") */
  label?: string;
  /** Whether this window is currently active */
  isActive?: boolean;
}

/**
 * Configuration constants for allocation calculations
 * These values control the behavior of the allocation engine
 */
export interface AllocationConstants {
  /** Baseline seed amount for investor calculations (default: 20,000) */
  INVESTOR_SEED_BASELINE: number;

  /** Entry fee rate applied to investor contributions (default: 0.10 = 10%) */
  ENTRY_FEE_RATE: number;

  /** Management fee rate applied to investor profits (default: 0.20 = 20%) */
  MGMT_FEE_RATE: number;

  /** Percentage of moonbag allocated to founders (default: 0.75 = 75%) */
  FOUNDERS_MOONBAG_PCT: number;

  /** Number of founders for calculation purposes (default: 2) */
  FOUNDERS_COUNT: number;

  /** Whether entry fees reduce investor credit (default: true) */
  ENTRY_FEE_REDUCES_INVESTOR_CREDIT: boolean;

  /** Maximum allowed dominance lead percentage (default: 0.0 = no minimum lead) */
  DOMINANCE_LEAD_PCT?: number;

  /** Minimum profit threshold for fee calculations (default: 0) */
  MIN_PROFIT_THRESHOLD?: number;

  /** Default draw amount per founder (default: 0) */
  DEFAULT_DRAW_PER_FOUNDER?: number;
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

/**
 * Complete allocation calculation results
 * All fields are guaranteed to be present after successful calculation
 */
export interface AllocationOutputs {
  /** Total profit calculated for the window */
  profitTotal: number;

  /** Realized profit available for distribution */
  realizedProfit: number;

  /** Dollar-days calculations for time-weighting */
  dollarDays: DollarDaysMap;

  /** Share allocations based on dollar-days */
  shares: SharesMap;

  /** Gross profit allocations before management fees */
  realizedGross: RealizedAllocation;

  /** Net profit allocations after management fees */
  realizedNet: RealizedAllocation;

  /** Management fee details */
  managementFees: ManagementFees;

  /** Moonbag (unrealized profit) allocations */
  moonbag: MoonbagAllocation;

  /** Generated management fee leg for next window (null if no fees) */
  foundersMgmtLeg: CashflowLeg | null;

  /** Generated moonbag legs for tracking */
  moonbagLegs: CashflowLeg[];

  /** End-of-window capital positions */
  endCapital: EndCapital;

  /** All expanded cashflow legs including auto-generated ones */
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

/**
 * Severity levels for validation issues
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Validation error or warning from allocation calculations
 */
export interface ValidationError {
  /** Unique identifier for this validation issue */
  id?: string;

  /** Severity level of the validation issue */
  type: ValidationSeverity | 'error' | 'warning' | 'info'; // Support both enum and legacy strings

  /** Field or property that caused the validation issue */
  field: string;

  /** Human-readable description of the validation issue */
  message: string;

  /** Expected value for comparison (if applicable) */
  expected?: number | string | null;

  /** Actual value that triggered the validation (if applicable) */
  actual?: number | string | null;

  /** Optional quick fix function for programmatic resolution */
  quickFix?: () => void;

  /** Label for the quick fix button */
  quickFixLabel?: string;

  /** Additional context or metadata */
  context?: Record<string, unknown>;
}

export interface AllocationSnapshot {
  id: string;
  timestamp: string;
  state: AllocationState;
  outputs: AllocationOutputs;
  trendRow: TrendRow;
  validationErrors: ValidationError[];
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface AllocationApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  validationErrors?: ValidationError[];
}

/**
 * Request payload for allocation calculations
 */
export interface AllocationCalculateRequest {
  state: AllocationState;
  options?: {
    validateOnly?: boolean;
    includeDebugInfo?: boolean;
    saveSnapshot?: boolean;
  };
}

/**
 * Response from allocation calculation API
 */
export interface AllocationCalculateResponse extends AllocationApiResponse<AllocationOutputs> {
  data?: AllocationOutputs;
  validationErrors?: ValidationError[];
  snapshot?: AllocationSnapshot;
  debugInfo?: {
    computeTimeMs: number;
    intermediateResults?: Record<string, unknown>;
  };
}

/**
 * Request to update allocation constants
 */
export interface AllocationConstantsUpdateRequest {
  constants: Partial<AllocationConstants>;
  reason?: string;
}

/**
 * Response from constants update API
 */
export interface AllocationConstantsUpdateResponse extends AllocationApiResponse<AllocationConstants> {
  data?: AllocationConstants;
  appliedAt?: string;
}

/**
 * Request to add or update contributions
 */
export interface ContributionUpdateRequest {
  contributions: Omit<CashflowLeg, 'id'>[];
  replaceAll?: boolean;
}

/**
 * Response from contribution update API
 */
export interface ContributionUpdateResponse extends AllocationApiResponse<CashflowLeg[]> {
  data?: CashflowLeg[];
  addedCount?: number;
  updatedCount?: number;
  removedCount?: number;
}

// =============================================================================
// Utility Types for Better Type Safety
// =============================================================================

/**
 * Keys that can be used for grouping allocations
 */
export type AllocationGroupByKey = 'owner' | 'type' | 'name' | 'window';

/**
 * Type-safe way to access nested allocation properties
 */
export type AllocationPath =
  | `outputs.${keyof AllocationOutputs}`
  | `state.${keyof AllocationState}`
  | `validationErrors.${number}.${keyof ValidationError}`;

/**
 * Non-nullable version of AllocationOutputs for when calculation is complete
 */
export type CompleteAllocationOutputs = Required<AllocationOutputs>;

/**
 * Strict typing for dollar amounts (prevents negative values where inappropriate)
 */
export type DollarAmount = number & { readonly __brand: 'DollarAmount' };

/**
 * Strict typing for percentages (0-1 range)
 */
export type Percentage = number & { readonly __brand: 'Percentage' };

/**
 * Helper to create branded dollar amount
 */
export function createDollarAmount(amount: number): DollarAmount {
  if (amount < 0) throw new Error('Dollar amount cannot be negative');
  return amount as DollarAmount;
}

/**
 * Helper to create branded percentage
 */
export function createPercentage(value: number): Percentage {
  if (value < 0 || value > 1) throw new Error('Percentage must be between 0 and 1');
  return value as Percentage;
}