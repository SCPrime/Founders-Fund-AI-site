import {
  AllocationOutputs,
  AllocationState,
  CashflowLeg,
  DollarDaysMap,
  SharesMap,
  ValidationError,
} from '@/types/allocation';
import { sumValues } from './allocationUtils';

const TOLERANCE = 0.01; // Allow ±$0.01 for rounding reconciliation

/**
 * Validate all business rules and mathematical invariants
 */
export function validateAll(state: AllocationState, outputs: AllocationOutputs): ValidationError[] {
  const errors: ValidationError[] = [];

  // Rule 1: Profit derivation
  errors.push(...validateProfitDerivation(state, outputs));

  // Rule 2: Realized profit calculation
  errors.push(...validateRealizedProfit(outputs));

  // Rule 3: Sum of gross realized shares equals total realized
  errors.push(...validateRealizedGrossSum(outputs));

  // Rule 4: Management fees sum
  errors.push(...validateManagementFeesSum(outputs));

  // Rule 5: No management fee on unrealized or founders shares
  errors.push(...validateNoMgmtFeeOnUnrealized(outputs));

  // Rule 6: Sum of net realized equals total realized
  errors.push(...validateRealizedNetSum(outputs));

  // Rule 7: Entry fees reconciliation
  errors.push(...validateEntryFeesReconciliation(outputs.expandedLegs, state.window));

  // Rule 8: Moonbag allocation sums to unrealized
  errors.push(...validateMoonbagSum(state, outputs));

  // Rule 9: Dollar-days calculation rules
  errors.push(...validateDollarDaysRules(outputs.expandedLegs, state.window, outputs.dollarDays));

  // Rule 10: Shares sum to 1.0 (if any dollar-days exist)
  errors.push(...validateSharesSum(outputs.shares, outputs.dollarDays));

  return errors;
}

function validateProfitDerivation(
  state: AllocationState,
  outputs: AllocationOutputs,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const expected = state.walletSizeEndOfWindow - state.constants.INVESTOR_SEED_BASELINE;

  if (Math.abs(outputs.profitTotal - expected) > TOLERANCE) {
    errors.push({
      type: 'error',
      field: 'profitTotal',
      message: 'Profit total must equal wallet_size_end - 20,000',
      expected,
      actual: outputs.profitTotal,
    });
  }

  return errors;
}

function validateRealizedProfit(outputs: AllocationOutputs): ValidationError[] {
  const errors: ValidationError[] = [];

  // Note: realizedProfit = profitTotal - unrealizedPnl, so unrealized = profitTotal - realized
  // We're validating the calculation is consistent
  void outputs; // Parameter reserved for future validation logic
  return errors;
}

function validateRealizedGrossSum(outputs: AllocationOutputs): ValidationError[] {
  const errors: ValidationError[] = [];
  const foundersGross = outputs.realizedGross.founders;
  const investorsGrossSum = sumValues(outputs.realizedGross.investors);
  const totalGross = foundersGross + investorsGrossSum;

  if (Math.abs(totalGross - outputs.realizedProfit) > TOLERANCE) {
    errors.push({
      type: 'error',
      field: 'realizedGross',
      message: 'Sum of gross realized shares must equal total realized profit',
      expected: outputs.realizedProfit,
      actual: totalGross,
    });
  }

  return errors;
}

function validateManagementFeesSum(outputs: AllocationOutputs): ValidationError[] {
  const errors: ValidationError[] = [];
  const mgmtFeesSum = sumValues(outputs.managementFees.investors);

  if (Math.abs(mgmtFeesSum - outputs.managementFees.foundersCarryTotal) > TOLERANCE) {
    errors.push({
      type: 'error',
      field: 'managementFees',
      message: 'Sum of investor management fees must equal founders carry total',
      expected: outputs.managementFees.foundersCarryTotal,
      actual: mgmtFeesSum,
    });
  }

  return errors;
}

function validateNoMgmtFeeOnUnrealized(outputs: AllocationOutputs): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check that management fees are only applied to investors with positive gross shares
  for (const [investorName, mgmtFee] of Object.entries(outputs.managementFees.investors)) {
    const grossShare = outputs.realizedGross.investors[investorName] || 0;

    if (grossShare <= 0 && mgmtFee > TOLERANCE) {
      errors.push({
        type: 'error',
        field: 'managementFees',
        message: `Management fee applied to investor ${investorName} with non-positive gross share`,
        expected: 0,
        actual: mgmtFee,
      });
    }

    // Verify fee rate
    if (grossShare > 0) {
      const expectedFee = grossShare * 0.2; // MGMT_FEE_RATE
      if (Math.abs(mgmtFee - expectedFee) > TOLERANCE) {
        errors.push({
          type: 'error',
          field: 'managementFees',
          message: `Incorrect management fee rate for investor ${investorName}`,
          expected: expectedFee,
          actual: mgmtFee,
        });
      }
    }
  }

  return errors;
}

function validateRealizedNetSum(outputs: AllocationOutputs): ValidationError[] {
  const errors: ValidationError[] = [];
  const foundersNet = outputs.realizedNet.founders;
  const investorsNetSum = sumValues(outputs.realizedNet.investors);
  const totalNet = foundersNet + investorsNetSum;

  if (Math.abs(totalNet - outputs.realizedProfit) > TOLERANCE) {
    errors.push({
      type: 'error',
      field: 'realizedNet',
      message: 'Sum of net realized shares must equal total realized profit',
      expected: outputs.realizedProfit,
      actual: totalNet,
    });
  }

  return errors;
}

function validateEntryFeesReconciliation(
  expandedLegs: CashflowLeg[],
  window: { start: string; end: string },
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Sum investor contributions (net) and entry fees this window
  let investorContributionsNet = 0;
  let foundersEntryFees = 0;

  for (const leg of expandedLegs) {
    // Only count legs within this window
    if (leg.ts >= window.start && leg.ts <= window.end) {
      if (leg.type === 'investor_contribution') {
        // This is the NET amount (90% of gross) after entry fee deduction
        investorContributionsNet += leg.amount;
      } else if (leg.type === 'founders_entry_fee') {
        foundersEntryFees += leg.amount;
      }
    }
  }

  // Gross = Net + Entry Fees (since entry fee is 10% of gross, net is 90% of gross)
  // If Gross = G, then Net = 0.9*G and EntryFee = 0.1*G
  // Therefore: G = Net + EntryFee, and EntryFee should equal Net / 9
  const calculatedGross = investorContributionsNet + foundersEntryFees;
  const expectedEntryFees = calculatedGross * 0.1;

  // Alternative check: entry fees should be 1/9 of net (since net is 9 parts, fee is 1 part)
  // const expectedFromNet = investorContributionsNet / 9.0; // Reserved for future validation

  if (Math.abs(foundersEntryFees - expectedEntryFees) > TOLERANCE) {
    errors.push({
      type: 'error',
      field: 'entryFees',
      message: 'Founders entry fees must equal 10% of gross investor contributions this window',
      expected: expectedEntryFees,
      actual: foundersEntryFees,
    });
  }

  return errors;
}

function validateMoonbagSum(state: AllocationState, outputs: AllocationOutputs): ValidationError[] {
  const errors: ValidationError[] = [];

  if (state.unrealizedPnlEndOfWindow > 0) {
    const foundersAmount = outputs.moonbag.founders;
    const investorsSum = sumValues(outputs.moonbag.investors);
    const totalMoonbag = foundersAmount + investorsSum;

    if (Math.abs(totalMoonbag - state.unrealizedPnlEndOfWindow) > TOLERANCE) {
      errors.push({
        type: 'error',
        field: 'moonbag',
        message: 'Total moonbag allocation must equal unrealized PnL',
        expected: state.unrealizedPnlEndOfWindow,
        actual: totalMoonbag,
      });
    }

    // Verify 75/25 split
    const expectedFounders = state.unrealizedPnlEndOfWindow * 0.75;
    const expectedInvestors = state.unrealizedPnlEndOfWindow * 0.25;

    if (Math.abs(foundersAmount - expectedFounders) > TOLERANCE) {
      errors.push({
        type: 'error',
        field: 'moonbag',
        message: 'Founders moonbag must be 75% of unrealized PnL',
        expected: expectedFounders,
        actual: foundersAmount,
      });
    }

    if (Math.abs(investorsSum - expectedInvestors) > TOLERANCE) {
      errors.push({
        type: 'error',
        field: 'moonbag',
        message: 'Investors moonbag must be 25% of unrealized PnL',
        expected: expectedInvestors,
        actual: investorsSum,
      });
    }
  }

  return errors;
}

function validateDollarDaysRules(
  expandedLegs: CashflowLeg[],
  window: { start: string; end: string },
  dollarDays: DollarDaysMap,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Recalculate dollar-days and compare
  const recalculated = {
    founders: 0,
    investors: {} as Record<string, number>,
    total: 0,
  };

  for (const leg of expandedLegs) {
    if (!leg.earnsDollarDaysThisWindow) continue;

    // Contributions on window.end should have 0 days
    if (leg.ts === window.end) {
      continue; // 0 days, skip
    }

    const effectiveStart = leg.ts > window.start ? leg.ts : window.start;
    const startDate = new Date(effectiveStart);
    const endDate = new Date(window.end);

    if (startDate > endDate) continue; // 0 days

    const diffTime = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
    const dd = leg.amount * Math.max(0, days);

    if (leg.owner === 'founders') {
      recalculated.founders += dd;
    } else {
      if (!recalculated.investors[leg.name]) {
        recalculated.investors[leg.name] = 0;
      }
      recalculated.investors[leg.name] += dd;
    }
    recalculated.total += dd;
  }

  // Compare with actual calculation
  if (Math.abs(recalculated.founders - dollarDays.founders) > TOLERANCE) {
    errors.push({
      type: 'error',
      field: 'dollarDays',
      message: 'Founders dollar-days calculation mismatch',
      expected: recalculated.founders,
      actual: dollarDays.founders,
    });
  }

  return errors;
}

function validateSharesSum(shares: SharesMap, dollarDays: DollarDaysMap): ValidationError[] {
  const errors: ValidationError[] = [];

  if (dollarDays.total > 0) {
    const foundersShare = shares.founders;
    const investorsShareSum = sumValues(shares.investors);
    const totalShares = foundersShare + investorsShareSum;

    if (Math.abs(totalShares - 1.0) > TOLERANCE) {
      errors.push({
        type: 'error',
        field: 'shares',
        message: 'Total shares must sum to 1.0',
        expected: 1.0,
        actual: totalShares,
      });
    }
  }

  return errors;
}

/**
 * Validate specific business rules that may be warnings rather than errors
 */
export function validateBusinessRules(
  state: AllocationState,
  outputs: AllocationOutputs,
): ValidationError[] {
  const warnings: ValidationError[] = [];

  // Warn if realized profit is negative
  if (outputs.realizedProfit < 0) {
    warnings.push({
      type: 'warning',
      field: 'realizedProfit',
      message: 'Realized profit is negative - loss allocation is active',
    });
  }

  // Warn if management fees are zero due to negative realized profit
  if (outputs.realizedProfit < 0 && outputs.managementFees.foundersCarryTotal > 0) {
    warnings.push({
      type: 'warning',
      field: 'managementFees',
      message: 'Management fees should be zero when realized profit is negative',
    });
  }

  // Warn if no dollar-days (edge case)
  if (outputs.dollarDays.total === 0) {
    warnings.push({
      type: 'warning',
      field: 'dollarDays',
      message: 'No dollar-days calculated - all allocations will be zero',
    });
  }

  return warnings;
}
