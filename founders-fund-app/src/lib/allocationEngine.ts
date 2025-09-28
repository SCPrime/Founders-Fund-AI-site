import {
  AllocationState,
  AllocationOutputs,
  CashflowLeg,
  DollarDaysMap,
  SharesMap,
  RealizedAllocation,
  ManagementFees,
  TrendRow,
  ValidationError
} from '@/types/allocation';

import {
  expandEntryFeeLegs,
  computeDollarDays,
  computeShares,
  allocateMoonbag,
  buildMoonbagLegs,
  computeEndCapital,
  sumValues,
  mapValues
} from '@/utils/allocationUtils';

import { validateAll, validateBusinessRules } from '@/utils/allocationValidation';

/**
 * Main allocation engine - implements the authoritative algorithm spec
 * Follows §3 recompute pipeline order exactly
 */
export class AllocationEngine {
  /**
   * Recompute all allocations following the deterministic pipeline
   */
  static recompute(state: AllocationState): AllocationOutputs {
    const { window, walletSizeEndOfWindow, unrealizedPnlEndOfWindow, contributions, constants } = state;

    // §3.1 Derive profits from wallet using comprehensive wallet identity (working calculator logic)
    console.log('DEBUG: Calculation inputs:', {
      walletSizeEndOfWindow,
      baseline: constants.INVESTOR_SEED_BASELINE,
      unrealizedPnlEndOfWindow,
      beforeCalc: 'profitTotal not calculated yet'
    });

    // Calculate total capital deployed (start capital + contributions)
    const totalStartCapital = constants.INVESTOR_SEED_BASELINE; // This includes all baseline capital
    const totalContributions = contributions.reduce((sum, contrib) => {
      return sum + (contrib.earnsDollarDaysThisWindow ? contrib.amount : 0);
    }, 0);

    // Use comprehensive wallet identity like working calculator
    let profitTotal = 0;
    if (walletSizeEndOfWindow > 0) {
      // profitCore = wallet - startCapital - contributions - unrealized (comprehensive accounting)
      profitTotal = walletSizeEndOfWindow - totalStartCapital - totalContributions - unrealizedPnlEndOfWindow;
    } else {
      // Fallback: if no wallet size, profit must be explicitly set to prevent negatives
      profitTotal = 0; // Default to 0 instead of negative
    }

    // Ensure profits are never negative
    profitTotal = Math.max(0, profitTotal);
    const realizedProfit = Math.max(0, profitTotal);

    console.log('DEBUG: After calculation (no negative profits):', {
      profitTotal,
      realizedProfit,
      totalStartCapital,
      totalContributions,
      calculation: `max(0, ${walletSizeEndOfWindow} - ${totalStartCapital} - ${totalContributions} - ${unrealizedPnlEndOfWindow}) = ${profitTotal}`,
      realizedCalc: `max(0, ${profitTotal}) = ${realizedProfit}`,
      clamped: profitTotal === 0 && (walletSizeEndOfWindow - totalStartCapital - totalContributions - unrealizedPnlEndOfWindow) < 0
    });

    // §3.2 Build effective legs (auto-legs + timing)
    const expandedLegs = expandEntryFeeLegs(contributions, constants.ENTRY_FEE_RATE);

    // §3.3 Dollar-days calculation
    const dollarDays = computeDollarDays(expandedLegs, window);

    // Short-circuit if no dollar-days
    if (dollarDays.total === 0) {
      return this.createZeroAllocation(
        profitTotal,
        realizedProfit,
        expandedLegs,
        dollarDays
      );
    }

    // §3.4 Time-weighted shares (all parties participate)
    const shares = computeShares(dollarDays);

    // §3.5 Allocate realized profit across all parties
    const { realizedGross, managementFees, realizedNet } = this.allocateRealizedProfit(
      realizedProfit,
      shares,
      constants.MGMT_FEE_RATE
    );

    // §3.6 Credit founders mgmt-fee leg (for next window)
    const foundersMgmtLeg = this.createFoundersMgmtLeg(
      managementFees.foundersCarryTotal,
      window.end
    );

    // §3.7 Allocate moonbag (unrealized) — no fee
    const moonbag = allocateMoonbag(
      unrealizedPnlEndOfWindow,
      dollarDays.investors,
      constants.FOUNDERS_MOONBAG_PCT
    );

    const moonbagLegs = buildMoonbagLegs(moonbag, window.end);

    // §3.9 End-of-window balances (reporting)
    const endCapital = computeEndCapital(expandedLegs, realizedNet);

    const outputs: AllocationOutputs = {
      profitTotal,
      realizedProfit,
      dollarDays,
      shares,
      realizedGross,
      realizedNet,
      managementFees,
      moonbag,
      foundersMgmtLeg,
      moonbagLegs,
      endCapital,
      expandedLegs
    };

    return outputs;
  }

  /**
   * Allocate realized profit with management fees (§3.5)
   */
  private static allocateRealizedProfit(
    realizedProfit: number,
    shares: SharesMap,
    mgmtFeeRate: number
  ): {
    realizedGross: RealizedAllocation;
    managementFees: ManagementFees;
    realizedNet: RealizedAllocation;
  } {
    // Gross realized shares
    const realizedGross: RealizedAllocation = {
      founders: realizedProfit * shares.founders,
      investors: mapValues(shares.investors, share => realizedProfit * share)
    };

    // Management fees (investors only, positive shares only)
    const mgmtFees: Record<string, number> = {};
    for (const [investorName, grossAmount] of Object.entries(realizedGross.investors)) {
      mgmtFees[investorName] = grossAmount > 0 ? grossAmount * mgmtFeeRate : 0;
    }

    const foundersCarryTotal = sumValues(mgmtFees);

    const managementFees: ManagementFees = {
      investors: mgmtFees,
      foundersCarryTotal
    };

    // Net realized amounts
    const realizedNet: RealizedAllocation = {
      founders: realizedGross.founders + foundersCarryTotal,
      investors: mapValues(realizedGross.investors, (gross, investorName) =>
        gross - mgmtFees[investorName]
      )
    };

    return { realizedGross, managementFees, realizedNet };
  }

  /**
   * Create founders management fee leg for next window (§3.6)
   */
  private static createFoundersMgmtLeg(
    foundersCarryTotal: number,
    windowEnd: string
  ): CashflowLeg | null {
    if (foundersCarryTotal <= 0) return null;

    return {
      id: `founders_mgmt_fee_${windowEnd}`,
      owner: 'founders',
      name: 'Founders',
      type: 'founders_mgmt_fee',
      amount: foundersCarryTotal,
      ts: windowEnd,
      earnsDollarDaysThisWindow: false
    };
  }

  /**
   * Create zero allocation for edge case where total dollar-days = 0
   */
  private static createZeroAllocation(
    profitTotal: number,
    realizedProfit: number,
    expandedLegs: CashflowLeg[],
    dollarDays: DollarDaysMap
  ): AllocationOutputs {
    return {
      profitTotal,
      realizedProfit,
      dollarDays,
      shares: { founders: 0, investors: {} },
      realizedGross: { founders: 0, investors: {} },
      realizedNet: { founders: 0, investors: {} },
      managementFees: { investors: {}, foundersCarryTotal: 0 },
      moonbag: { founders: 0, investors: {} },
      foundersMgmtLeg: null,
      moonbagLegs: [],
      endCapital: { founders: 0, investors: {} },
      expandedLegs
    };
  }

  /**
   * Validate outputs against business rules
   */
  static validate(state: AllocationState, outputs: AllocationOutputs): ValidationError[] {
    const errors = validateAll(state, outputs);
    const warnings = validateBusinessRules(state, outputs);
    return [...errors, ...warnings];
  }

  /**
   * Create trend row for historical tracking (§4)
   */
  static createTrendRow(
    state: AllocationState,
    outputs: AllocationOutputs
  ): TrendRow {
    return {
      window: state.window,
      walletSizeEnd: state.walletSizeEndOfWindow,
      profitTotal: outputs.profitTotal,
      unrealized: state.unrealizedPnlEndOfWindow,
      realized: outputs.realizedProfit,
      dollarDays: outputs.dollarDays,
      shares: outputs.shares,
      realizedNet: outputs.realizedNet,
      managementFees: outputs.managementFees,
      moonbag: outputs.moonbag,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Save snapshot with all data (trend + audit)
   */
  static saveSnapshot(
    state: AllocationState,
    outputs: AllocationOutputs,
    validationErrors: ValidationError[]
  ): {
    trendRow: TrendRow;
    auditLegs: CashflowLeg[];
    snapshot: {
      id: string;
      timestamp: string;
      state: AllocationState;
      outputs: AllocationOutputs;
      trendRow: TrendRow;
      validationErrors: ValidationError[];
    };
  } {
    const trendRow = this.createTrendRow(state, outputs);

    // Audit legs are the derived legs that will be persisted for next window
    const auditLegs: CashflowLeg[] = [];

    if (outputs.foundersMgmtLeg) {
      auditLegs.push(outputs.foundersMgmtLeg);
    }

    auditLegs.push(...outputs.moonbagLegs);

    const snapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: new Date().toISOString(),
      state,
      outputs,
      trendRow,
      validationErrors
    };

    return { trendRow, auditLegs, snapshot };
  }

  /**
   * Utility: Calculate what-if scenarios by modifying state parameters
   */
  static whatIf(
    baseState: AllocationState,
    modifications: Partial<AllocationState>
  ): AllocationOutputs {
    const modifiedState = { ...baseState, ...modifications };
    return this.recompute(modifiedState);
  }

  /**
   * Utility: Calculate impact of adding a new contribution
   */
  static addContributionImpact(
    baseState: AllocationState,
    newContribution: Omit<CashflowLeg, 'id'>
  ): {
    before: AllocationOutputs;
    after: AllocationOutputs;
    impact: {
      dollarDaysChange: { founders: number; investors: Record<string, number> };
      sharesChange: { founders: number; investors: Record<string, number> };
      realizedNetChange: { founders: number; investors: Record<string, number> };
    };
  } {
    const before = this.recompute(baseState);

    const newLeg: CashflowLeg = {
      ...newContribution,
      id: `temp_${Date.now()}`
    };

    const modifiedState = {
      ...baseState,
      contributions: [...baseState.contributions, newLeg]
    };

    const after = this.recompute(modifiedState);

    // Calculate impact
    const impact = {
      dollarDaysChange: {
        founders: after.dollarDays.founders - before.dollarDays.founders,
        investors: Object.keys(after.dollarDays.investors).reduce((acc, name) => {
          acc[name] = (after.dollarDays.investors[name] || 0) - (before.dollarDays.investors[name] || 0);
          return acc;
        }, {} as Record<string, number>)
      },
      sharesChange: {
        founders: after.shares.founders - before.shares.founders,
        investors: Object.keys(after.shares.investors).reduce((acc, name) => {
          acc[name] = (after.shares.investors[name] || 0) - (before.shares.investors[name] || 0);
          return acc;
        }, {} as Record<string, number>)
      },
      realizedNetChange: {
        founders: after.realizedNet.founders - before.realizedNet.founders,
        investors: Object.keys(after.realizedNet.investors).reduce((acc, name) => {
          acc[name] = (after.realizedNet.investors[name] || 0) - (before.realizedNet.investors[name] || 0);
          return acc;
        }, {} as Record<string, number>)
      }
    };

    return { before, after, impact };
  }
}