import { CashflowLeg, Window, DollarDaysMap, SharesMap, AllocationConstants } from '@/types/allocation';

/**
 * Calculate days between two dates (inclusive)
 * Returns 0 if start > end
 */
export function daysBetweenInclusive(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (startDate > endDate) return 0;

  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
  return Math.max(0, diffDays);
}

/**
 * Expand input legs to create founders entry-fee legs automatically
 */
export function expandEntryFeeLegs(
  inputLegs: CashflowLeg[],
  entryFeeRate: number
): CashflowLeg[] {
  const expandedLegs: CashflowLeg[] = [];

  for (const leg of inputLegs) {
    // Add the original leg (may be modified for investor contributions)
    if (leg.type === 'investor_contribution') {
      // For investor contributions, create net contribution and entry fee legs
      const grossAmount = leg.amount / (1 - entryFeeRate); // Reverse calculate gross
      const entryFeeAmount = grossAmount * entryFeeRate;
      const netAmount = grossAmount - entryFeeAmount;

      // Add net investor contribution
      expandedLegs.push({
        ...leg,
        amount: netAmount,
        earnsDollarDaysThisWindow: true
      });

      // Add corresponding founders entry fee
      expandedLegs.push({
        id: `${leg.id}_entry_fee`,
        owner: 'founders',
        name: 'Founders',
        type: 'founders_entry_fee',
        amount: entryFeeAmount,
        ts: leg.ts,
        earnsDollarDaysThisWindow: true
      });
    } else {
      // Add leg as-is
      expandedLegs.push(leg);
    }
  }

  return expandedLegs;
}

/**
 * Compute dollar-days for all legs within the window
 */
export function computeDollarDays(
  legs: CashflowLeg[],
  window: Window
): DollarDaysMap {
  const result: DollarDaysMap = {
    founders: 0,
    investors: {},
    total: 0
  };

  for (const leg of legs) {
    if (!leg.earnsDollarDaysThisWindow) continue;

    // Calculate days: max(0, daysBetweenInclusive(max(leg.ts, window.start), window.end))
    const effectiveStart = leg.ts > window.start ? leg.ts : window.start;
    const days = daysBetweenInclusive(effectiveStart, window.end);

    const dollarDays = leg.amount * days;

    if (leg.owner === 'founders') {
      result.founders += dollarDays;
    } else {
      // Investor
      if (!result.investors[leg.name]) {
        result.investors[leg.name] = 0;
      }
      result.investors[leg.name] += dollarDays;
    }

    result.total += dollarDays;
  }

  return result;
}

/**
 * Compute time-weighted shares from dollar-days
 */
export function computeShares(dollarDays: DollarDaysMap): SharesMap {
  if (dollarDays.total === 0) {
    return {
      founders: 0,
      investors: {}
    };
  }

  const result: SharesMap = {
    founders: dollarDays.founders / dollarDays.total,
    investors: {}
  };

  for (const [investorName, dd] of Object.entries(dollarDays.investors)) {
    result.investors[investorName] = dd / dollarDays.total;
  }

  return result;
}

/**
 * Allocate moonbag (unrealized) profits
 * 75% to founders, 25% to investors (split pro-rata by investor dollar-days only)
 */
export function allocateMoonbag(
  unrealizedPnl: number,
  investorDollarDays: Record<string, number>,
  foundersPct: number
): { founders: number; investors: Record<string, number> } {
  if (unrealizedPnl <= 0) {
    return {
      founders: 0,
      investors: {}
    };
  }

  const foundersAmount = unrealizedPnl * foundersPct;
  const investorsTotal = unrealizedPnl * (1 - foundersPct);

  const investorDDTotal = Object.values(investorDollarDays).reduce((sum, dd) => sum + dd, 0);

  const investorAllocations: Record<string, number> = {};

  if (investorDDTotal > 0) {
    for (const [investorName, dd] of Object.entries(investorDollarDays)) {
      investorAllocations[investorName] = (dd / investorDDTotal) * investorsTotal;
    }
  }

  return {
    founders: foundersAmount,
    investors: investorAllocations
  };
}

/**
 * Build moonbag legs for next window (credited at window end, don't earn this window)
 */
export function buildMoonbagLegs(
  moonbagAllocation: { founders: number; investors: Record<string, number> },
  windowEndTs: string
): CashflowLeg[] {
  const legs: CashflowLeg[] = [];

  // Founders moonbag leg
  if (moonbagAllocation.founders > 0) {
    legs.push({
      id: `moonbag_founders_${windowEndTs}`,
      owner: 'founders',
      name: 'Founders',
      type: 'moonbag_founders',
      amount: moonbagAllocation.founders,
      ts: windowEndTs,
      earnsDollarDaysThisWindow: false
    });
  }

  // Investor moonbag legs
  for (const [investorName, amount] of Object.entries(moonbagAllocation.investors)) {
    if (amount > 0) {
      legs.push({
        id: `moonbag_${investorName}_${windowEndTs}`,
        owner: 'investor',
        name: investorName,
        type: 'moonbag_investor',
        amount: amount,
        ts: windowEndTs,
        earnsDollarDaysThisWindow: false
      });
    }
  }

  return legs;
}

/**
 * Compute end-of-window capital balances for reporting
 */
export function computeEndCapital(
  legs: CashflowLeg[],
  realizedNet: { founders: number; investors: Record<string, number> }
): { founders: number; investors: Record<string, number> } {
  const result = {
    founders: 0,
    investors: {} as Record<string, number>
  };

  // Sum credited contributions that earn DD this window
  for (const leg of legs) {
    if (leg.earnsDollarDaysThisWindow) {
      if (leg.owner === 'founders') {
        result.founders += leg.amount;
      } else {
        if (!result.investors[leg.name]) {
          result.investors[leg.name] = 0;
        }
        result.investors[leg.name] += leg.amount;
      }
    }
  }

  // Add realized profit net
  result.founders += realizedNet.founders;
  for (const [investorName, amount] of Object.entries(realizedNet.investors)) {
    if (!result.investors[investorName]) {
      result.investors[investorName] = 0;
    }
    result.investors[investorName] += amount;
  }

  return result;
}

/**
 * Get default allocation constants
 */
export function getDefaultConstants(): AllocationConstants {
  return {
    INVESTOR_SEED_BASELINE: 20000,
    ENTRY_FEE_RATE: 0.10,
    MGMT_FEE_RATE: 0.20,
    FOUNDERS_MOONBAG_PCT: 0.75,
    FOUNDERS_COUNT: 2,
    ENTRY_FEE_REDUCES_INVESTOR_CREDIT: true
  };
}

/**
 * Create hardwired seed dataset (founders only)
 */
export function createSeedDataset(): CashflowLeg[] {
  return [
    {
      id: 'founders_seed',
      owner: 'founders',
      name: 'Founders',
      type: 'seed',
      amount: 5000,
      ts: '2025-07-10',
      earnsDollarDaysThisWindow: true
    }
  ];
}

/**
 * Utility to sum values in a record
 */
export function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((sum, val) => sum + val, 0);
}

/**
 * Utility to map values in a record
 */
export function mapValues<T, U>(
  record: Record<string, T>,
  mapper: (value: T, key: string) => U
): Record<string, U> {
  const result: Record<string, U> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = mapper(value, key);
  }
  return result;
}