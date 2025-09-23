import {
  Contribution,
  FundSettings,
  CalculatedResult,
  CalculationSummary
} from '@/types/fund';

/**
 * Calculate dollar-days for a contribution within the specified window
 */
export function calculateDollarDays(
  contribution: Contribution,
  windowStart: Date,
  windowEnd: Date
): number {
  const contribDate = new Date(contribution.date);

  // If contribution is after window end, no dollar-days
  if (contribDate > windowEnd) {
    return 0;
  }

  // If contribution is before window start, it gets full window days
  let effectiveDate = contribDate;
  if (contribDate < windowStart) {
    effectiveDate = windowStart;
  }

  // Calculate days from effective date to window end
  const daysInWindow = Math.max(0,
    Math.ceil((windowEnd.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  return contribution.amount * daysInWindow;
}

/**
 * Group contributions by investor/founder
 */
export function groupContributions(contributions: Contribution[]): { [key: string]: Contribution[] } {
  const groups: { [key: string]: Contribution[] } = {};

  contributions.forEach(contrib => {
    const key = `${contrib.name}_${contrib.cls}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(contrib);
  });

  return groups;
}

/**
 * Calculate total contributions for a group, applying entry fee reduction if needed
 */
export function calculateTotalContributions(
  contributions: Contribution[],
  entryFeeRate: number,
  feeReducesInvestor: 'yes' | 'no'
): number {
  let total = 0;

  contributions.forEach(contrib => {
    let amount = contrib.amount;

    // Apply entry fee reduction for investors if enabled
    if (contrib.cls === 'investor' &&
        feeReducesInvestor === 'yes' &&
        contrib.rule === 'net') {
      amount *= (1 - entryFeeRate);
    }

    total += amount;
  });

  return total;
}

/**
 * Main calculation engine - calculates fund split based on time-weighted dollar-days
 */
export function calculateFundSplit(
  contributions: Contribution[],
  settings: FundSettings
): { results: CalculatedResult[], summary: CalculationSummary } {

  const windowStart = new Date(settings.winStart);
  const windowEnd = new Date(settings.winEnd);
  const windowDays = Math.max(1,
    Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Group contributions by participant
  const contributionGroups = groupContributions(contributions);
  const results: CalculatedResult[] = [];

  let totalDollarDays = 0;
  let totalContributions = 0;

  const entryFeeRate = settings.entryFeePct / 100;
  const mgmtFeeRate = settings.mgmtFeePct / 100;

  // First pass: Calculate dollar-days and basic metrics
  Object.entries(contributionGroups).forEach(([key, contribs]) => {
    if (contribs.length === 0) return;

    const participant = contribs[0];
    let dollarDays = 0;

    // Calculate total dollar-days for this participant
    contribs.forEach(contrib => {
      dollarDays += calculateDollarDays(contrib, windowStart, windowEnd);
    });

    // Calculate total contributions (with fee adjustment if applicable)
    const participantContributions = calculateTotalContributions(
      contribs,
      entryFeeRate,
      settings.feeReducesInvestor
    );

    // Founders start with $5,000 seed capital
    const startCapital = participant.cls === 'founder' ? 5000 : 0;

    const result: CalculatedResult = {
      id: key,
      name: participant.name,
      cls: participant.cls,
      startCapital,
      contributions: participantContributions,
      dollarDays,
      twShare: 0, // Will calculate after total is known
      baseProfitShare: 0,
      regularFee: 0,
      moonbag: 0,
      draws: participant.cls === 'founder' ? settings.drawPerFounder : 0,
      netProfit: 0,
      pgp: 0,
      endCapital: 0
    };

    results.push(result);
    totalDollarDays += dollarDays;
    totalContributions += participantContributions;
  });

  // Second pass: Calculate time-weighted shares and profit distribution
  const totalRealizedProfit = settings.realizedProfit;
  let totalBaseProfitShare = 0;

  results.forEach(result => {
    // Time-weighted share calculation
    result.twShare = totalDollarDays > 0 ? (result.dollarDays / totalDollarDays) * 100 : 0;

    // Base profit share (before fees)
    result.baseProfitShare = (result.twShare / 100) * totalRealizedProfit;
    totalBaseProfitShare += result.baseProfitShare;
  });

  // Third pass: Calculate fees
  const investorResults = results.filter(r => r.cls === 'investor');
  const founderResults = results.filter(r => r.cls === 'founder');

  // Calculate total fees collected from investors
  const totalMgmtFeesCollected = investorResults
    .reduce((sum, r) => sum + (r.baseProfitShare * mgmtFeeRate), 0);

  const totalEntryFeesCollected = investorResults
    .reduce((sum, r) => {
      // Get original contributions (before fee adjustment)
      const originalContribs = contributionGroups[r.id]?.reduce((s, c) => s + c.amount, 0) || 0;
      return sum + (originalContribs * entryFeeRate);
    }, 0);

  const founderCount = Math.max(1, founderResults.length || settings.founderCount);

  // Fourth pass: Apply fees and moonbag
  let totalFees = 0;
  let totalMoonbagDistributed = 0;
  let totalDraws = 0;

  results.forEach(result => {
    // Management fees
    let mgmtFee = 0;
    if (result.cls === 'investor') {
      mgmtFee = -(result.baseProfitShare * mgmtFeeRate); // Negative = they pay
    } else if (result.cls === 'founder') {
      mgmtFee = totalMgmtFeesCollected / founderCount; // Positive = they receive
    }

    // Entry fees
    let entryFee = 0;
    if (result.cls === 'investor') {
      const originalContribs = contributionGroups[result.id]?.reduce((s, c) => s + c.amount, 0) || 0;
      entryFee = -(originalContribs * entryFeeRate); // Negative = they pay
    } else if (result.cls === 'founder') {
      entryFee = totalEntryFeesCollected / founderCount; // Positive = they receive
    }

    // Combine fees
    result.regularFee = mgmtFee + entryFee;
    totalFees += result.regularFee;

    // Moonbag distribution
    const totalUnrealizedProfit = settings.moonbagUnreal || 0;
    if (result.cls === 'founder') {
      // 75% of unrealized profit split equally among founders
      result.moonbag = (totalUnrealizedProfit * (settings.moonbagFounderPct / 100)) / founderCount;
    } else if (result.cls === 'investor') {
      // Remaining % distributed time-weighted to investors (no mgmt fees on moonbag)
      const investorPct = (100 - settings.moonbagFounderPct) / 100;
      result.moonbag = (totalUnrealizedProfit * investorPct) * (result.twShare / 100);
    }
    totalMoonbagDistributed += result.moonbag;

    // Apply draws
    totalDraws += result.draws;

    // Calculate net profit
    result.netProfit = result.baseProfitShare + result.regularFee + result.moonbag - result.draws;

    // Period Gross Profit percentage
    result.pgp = result.contributions > 0 ? (result.netProfit / result.contributions) * 100 : 0;

    // End capital
    result.endCapital = result.startCapital + result.contributions + result.netProfit;
  });

  const summary: CalculationSummary = {
    totalContributions,
    totalDollarDays,
    totalBaseProfitShare,
    totalFees,
    totalNetProfit: results.reduce((sum, r) => sum + r.netProfit, 0),
    windowDays,
    totalMgmtFeesCollected,
    totalEntryFeesCollected,
    totalMoonbagDistributed,
    totalDraws
  };

  return { results, summary };
}