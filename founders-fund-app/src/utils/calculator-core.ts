/**
 * Calculator Core - Direct port from working HTML calculator
 * This implements the exact calculation logic from https://scprime.github.io/figment-splits-site/
 */

import { CashflowLeg, AllocationConstants } from '@/types/allocation';
import { Contribution, FundSettings } from '@/types/fund';

export interface CalculatorInputs {
  winStart: string;
  winEnd: string;
  walletSize: number;
  realizedProfit: number;
  moonbagReal: number;
  moonbagUnreal: number;
  includeUnreal: boolean;
  moonbagFounderPct: number;
  mgmtFeePct: number;
  entryFeePct: number;
  feeReducesInvestor: boolean;
  founderCount: number;
  drawPerFounder: number;
  applyDraws: boolean;
  domLeadPct: number;
  founders: Array<{
    date: string;
    amount: number;
  }>;
  investors: Array<{
    name: string;
    date: string;
    amount: number;
    rule: 'default' | 'yes' | 'no';
  }>;
}

export interface FundStoreData {
  window?: { start?: string; end?: string };
  walletSizeEndOfWindow?: number;
  constants?: AllocationConstants;
  settings?: {
    realizedProfit?: number;
    moonbagUnreal?: number;
    moonbagFounderPct?: number;
    mgmtFeePct?: number;
    entryFeePct?: number;
  };
  contributions?: CashflowLeg[];
}

export interface CalculatorOutputs {
  start: string;
  end: string;
  totalDays: number;
  founders: {
    name: string;
    startCap: number;
    contribInWin: number;
    dd: number;
    base: number;
    net: number;
    end: number;
    pgp: number;
  };
  investors: Array<{
    name: string;
    startCap: number;
    contribInWin: number;
    dd: number;
    base: number;
    feeMgmt: number;
    moon: number;
    net: number;
    end: number;
    entryPre: number;
    entryIn: number;
    pgp: number;
  }>;
  summary: {
    totalDD: number;
    shareF: number;
    totalStartCap: number;
    totalContribWin: number;
    profitCore: number;
    netF: number;
    investorsNetTotal: number;
    feeFromI_total: number;
    feesToFounders_total: number;
    endSum: number;
    domState: 'good' | 'warn' | 'bad';
    domMsg: string;
    reqF: number;
    maxInvEnd: number;
    minWallet: number;
  };
  moonbag: {
    moonbagReal: number;
    moonbagUnreal: number;
    moonF: number;
    moonI_total: number;
  };
}

function daysBetweenInclusive(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function parseNum(value: number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function gatherFounders(founders: Array<{ date: string; amount: number }>, start: string, end: string) {
  let startCap = 0;
  let contribInWin = 0;
  let dd = 0;
  const totalDays = daysBetweenInclusive(start, end);

  for (const founder of founders) {
    const d = founder.date;
    const amount = parseNum(founder.amount);
    if (amount <= 0 || !d) continue;

    if (d <= start) {
      startCap += amount;
    }

    const inWinStart = d < start ? start : d;
    if (inWinStart <= end) {
      const days = daysBetweenInclusive(inWinStart, end);
      dd += amount * days;
      if (d > start && d <= end) {
        contribInWin += amount;
      }
    }
  }

  return { startCap, contribInWin, dd };
}

export function computeAllocation(inputs: CalculatorInputs): CalculatorOutputs {
  const {
    winStart: start,
    winEnd: end,
    walletSize,
    realizedProfit,
    moonbagReal,
    moonbagUnreal,
    includeUnreal,
    moonbagFounderPct,
    mgmtFeePct,
    entryFeePct,
    feeReducesInvestor,
    founderCount,
    drawPerFounder,
    applyDraws,
    domLeadPct,
    founders,
    investors
  } = inputs;

  const totalDays = daysBetweenInclusive(start, end);
  const mgmtFee = mgmtFeePct / 100.0;
  const entryFee = entryFeePct / 100.0;
  const moonbagFounderPctDecimal = moonbagFounderPct / 100.0;
  const drawTotal = applyDraws ? Math.max(1, founderCount) * drawPerFounder : 0;
  const domLead = domLeadPct / 100.0;

  // Gather founders data
  const f = gatherFounders(founders, start, end);

  // Process investors
  const invMap = new Map();
  let invDDsum = 0;
  let entryFees_thisWin = 0;
  const entryPreBy = new Map();
  const entryInBy = new Map();

  for (const investor of investors) {
    const name = investor.name.trim() || 'Investor';
    const d = investor.date;
    const aGross = parseNum(investor.amount);
    if (aGross <= 0 || !d) continue;

    const feeMode = investor.rule === 'default' ? (feeReducesInvestor ? 'yes' : 'no') : investor.rule;
    const aNet = feeMode === 'yes' ? aGross * (1 - entryFee) : aGross;
    const entryAmt = aGross * entryFee;

    if (!invMap.has(name)) {
      invMap.set(name, {
        name,
        startCap: 0,
        contribInWin: 0,
        dd: 0,
        preStart: 0
      });
    }
    const rec = invMap.get(name);

    if (d <= start) {
      rec.startCap += aNet;
      rec.preStart += aNet;
    }

    const inWinStart = d < start ? start : d;
    if (inWinStart <= end) {
      const days = daysBetweenInclusive(inWinStart, end);
      rec.dd += aNet * days;
      invDDsum += aNet * days;
      if (d > start && d <= end) {
        rec.contribInWin += aNet;
      }

      // Founders get entry fees as capital
      f.dd += entryAmt * days;
      if (d <= start) {
        f.startCap += entryAmt;
        entryPreBy.set(name, (entryPreBy.get(name) || 0) + entryAmt);
      }
      if (d > start && d <= end) {
        f.contribInWin = (f.contribInWin || 0) + entryAmt;
        entryInBy.set(name, (entryInBy.get(name) || 0) + entryAmt);
        entryFees_thisWin += entryAmt;
      }
    }
    invMap.set(name, rec);
  }

  const totalDD = f.dd + invDDsum;
  const shareF = totalDD > 0 ? f.dd / totalDD : 0;

  // Totals for identity
  const invList = Array.from(invMap.values());
  const invStartSum = invList.reduce((s, x) => s + x.startCap, 0);
  const invContribSum = invList.reduce((s, x) => s + x.contribInWin, 0);
  const totalStartCap = f.startCap + invStartSum;
  const totalContribWin = (f.contribInWin || 0) + invContribSum;

  // Wallet identity calculation
  const minWallet = totalStartCap + totalContribWin - drawTotal + moonbagReal + (includeUnreal ? moonbagUnreal : 0);
  let profitCore = 0;
  if (walletSize > 0) {
    profitCore = walletSize - totalStartCap - totalContribWin + drawTotal - moonbagReal - (includeUnreal ? moonbagUnreal : 0);
  } else {
    profitCore = realizedProfit;
  }

  // Base profit allocations by time-weight
  const baseF = profitCore * shareF;
  const baseI_each = invList.map(x => profitCore * (totalDD > 0 ? x.dd / totalDD : 0));

  // Regular management fee (on investor base profit > 0)
  const feeFromI_each = baseI_each.map(x => x > 0 ? x * mgmtFee : 0);
  const feeFromI_total = feeFromI_each.reduce((s, x) => s + x, 0);

  // Moonbag realized split
  const moonF = moonbagReal * moonbagFounderPctDecimal;
  const moonI_total = moonbagReal - moonF;
  const moonI_each = invList.map(x => invDDsum > 0 ? moonI_total * (x.dd / invDDsum) : 0);

  // Net profits
  const netF = baseF + feeFromI_total + moonF - drawTotal;
  const netI_each = invList.map((x, i) => (baseI_each[i] - feeFromI_each[i]) + moonI_each[i]);

  // End capitals
  const endF = f.startCap + (f.contribInWin || 0) + netF;
  const endI_each = invList.map((x, i) => x.startCap + x.contribInWin + netI_each[i]);
  const endSum = endF + endI_each.reduce((s, x) => s + x, 0);

  // Dominance
  const maxInvEnd = endI_each.length ? Math.max(...endI_each) : 0;
  const reqF = maxInvEnd * (1 + domLead);
  let domState: 'good' | 'warn' | 'bad' = 'warn';
  let domMsg = '';
  if (endF >= reqF) {
    domState = 'good';
    domMsg = 'Dominance OK';
  } else if ((f.startCap + (f.contribInWin || 0) + baseF + feeFromI_total + moonF) >= reqF) {
    domState = 'warn';
    domMsg = 'Reduce draw to maintain dominance.';
  } else {
    domState = 'bad';
    domMsg = 'Increase profit or reduce draws; founders below largest investor.';
  }

  // PGP (period) values
  const pgpF = f.dd > 0 ? (netF * totalDays / f.dd) : 0;

  // Investor summary for output
  const investorSummary = invList.map((x, i) => ({
    name: x.name,
    startCap: x.startCap,
    contribInWin: x.contribInWin,
    dd: x.dd,
    base: baseI_each[i],
    feeMgmt: feeFromI_each[i],
    moon: moonI_each[i],
    net: netI_each[i],
    end: endI_each[i],
    entryPre: entryPreBy.get(x.name) || entryPreBy.get(x.name.toLowerCase()) || 0,
    entryIn: entryInBy.get(x.name) || entryInBy.get(x.name.toLowerCase()) || 0,
    pgp: x.dd > 0 ? (netI_each[i] * totalDays / x.dd) : 0
  }));

  const feesToFounders_total = entryFees_thisWin + feeFromI_total;
  const investorsNetTotal = netI_each.reduce((s, x) => s + x, 0);

  return {
    start,
    end,
    totalDays,
    founders: {
      name: 'Founders',
      startCap: f.startCap,
      contribInWin: f.contribInWin || 0,
      dd: f.dd,
      base: baseF,
      net: netF,
      end: endF,
      pgp: pgpF
    },
    investors: investorSummary,
    summary: {
      totalDD,
      shareF,
      totalStartCap,
      totalContribWin,
      profitCore,
      netF,
      investorsNetTotal,
      feeFromI_total,
      feesToFounders_total,
      endSum,
      domState,
      domMsg,
      reqF,
      maxInvEnd,
      minWallet
    },
    moonbag: {
      moonbagReal,
      moonbagUnreal,
      moonF,
      moonI_total
    }
  };
}

/**
 * Convert from the current allocationStore format to calculator inputs
 */
/**
 * Convert from fund store format to calculator inputs
 */
export function fromFundStore(store: {
  contributions: Contribution[];
  settings: FundSettings;
}): CalculatorInputs {
  const today = new Date().toISOString().split('T')[0];

  return {
    winStart: store.settings.winStart || '2025-08-30',
    winEnd: store.settings.winEnd || today,
    walletSize: store.settings.walletSize || 0,
    realizedProfit: store.settings.realizedProfit || 1500,
    moonbagReal: store.settings.moonbagReal || 0,
    moonbagUnreal: store.settings.moonbagUnreal || 0,
    includeUnreal: store.settings.includeUnreal === 'yes',
    moonbagFounderPct: store.settings.moonbagFounderPct || 75,
    mgmtFeePct: store.settings.mgmtFeePct || 20,
    entryFeePct: store.settings.entryFeePct || 10,
    feeReducesInvestor: true,
    founderCount: 2,
    drawPerFounder: 0,
    applyDraws: false,
    domLeadPct: 0,
    founders: store.contributions?.filter((c) => c.cls === 'founder').map((c) => ({
      date: c.date,
      amount: c.amount
    })) || [],
    investors: store.contributions?.filter((c) => c.cls === 'investor').map((c) => ({
      name: c.name,
      date: c.date,
      amount: c.amount,
      rule: 'default' as 'default' | 'yes' | 'no'
    })) || []
  };
}

export function fromAllocationStore(store: FundStoreData): CalculatorInputs {
  const today = new Date().toISOString().split('T')[0];

  return {
    winStart: store.window?.start || '2025-08-30',
    winEnd: store.window?.end || today,
    walletSize: store.walletSizeEndOfWindow || 0,
    realizedProfit: store.settings?.realizedProfit || 0,
    moonbagReal: 0,
    moonbagUnreal: store.settings?.moonbagUnreal || 0,
    includeUnreal: false,
    moonbagFounderPct: store.settings?.moonbagFounderPct || (store.constants?.FOUNDERS_MOONBAG_PCT ? store.constants.FOUNDERS_MOONBAG_PCT * 100 : 75),
    mgmtFeePct: store.settings?.mgmtFeePct || (store.constants?.MGMT_FEE_RATE ? store.constants.MGMT_FEE_RATE * 100 : 20),
    entryFeePct: store.settings?.entryFeePct || (store.constants?.ENTRY_FEE_RATE ? store.constants.ENTRY_FEE_RATE * 100 : 10),
    feeReducesInvestor: store.constants?.ENTRY_FEE_REDUCES_INVESTOR_CREDIT ?? true,
    founderCount: store.constants?.FOUNDERS_COUNT || 2,
    drawPerFounder: 0,
    applyDraws: false,
    domLeadPct: 0,
    founders: store.contributions?.filter((c) => c.owner === 'founders').map((c) => ({
      date: c.ts,
      amount: c.amount
    })) || [],
    investors: store.contributions?.filter((c) => c.owner === 'investor').map((c) => ({
      name: c.name,
      date: c.ts,
      amount: c.amount,
      rule: 'default' as 'default' | 'yes' | 'no'
    })) || []
  };
}

export default computeAllocation;