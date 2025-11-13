import { CashflowLeg, AllocationConstants } from '@/types/allocation';

export interface DefaultSeed {
  window: {
    start: string;
    end: string;
  };
  constants: AllocationConstants;
  contributions: CashflowLeg[];
}

export const getDefaultSeed = (): DefaultSeed => {
  const entryFeeRate = 0.10;

  // Calculate net amounts and entry fees for investors
  const lauraCounts = [
    { amount: 5000, date: '2025-07-22' },
    { amount: 5000, date: '2025-08-01' },
    { amount: 2500, date: '2025-08-15' },
    { amount: 2500, date: '2025-09-01' }
  ];

  const damonContrib = { amount: 5000, date: '2025-08-15' };

  const contributions: CashflowLeg[] = [];

  // Add founders seed
  contributions.push({
    id: 'founders_seed',
    owner: 'founders',
    name: 'Founders',
    type: 'seed',
    amount: 5000,
    ts: '2025-07-10',
    earnsDollarDaysThisWindow: true
  });

  // Add Laura's contributions (net-of-fee)
  lauraCounts.forEach((contrib, index) => {
    const grossAmount = contrib.amount / (1 - entryFeeRate);
    const entryFeeAmount = grossAmount * entryFeeRate;
    const netAmount = grossAmount - entryFeeAmount;

    // Laura's net contribution
    contributions.push({
      id: `laura_${contrib.date}_${index}`,
      owner: 'investor',
      name: 'Laura',
      type: 'investor_contribution',
      amount: netAmount,
      ts: contrib.date,
      earnsDollarDaysThisWindow: true
    });

    // Corresponding entry fee to founders
    contributions.push({
      id: `laura_${contrib.date}_${index}_entry_fee`,
      owner: 'founders',
      name: 'Founders',
      type: 'founders_entry_fee',
      amount: entryFeeAmount,
      ts: contrib.date,
      earnsDollarDaysThisWindow: true
    });
  });

  // Add Damon's contribution (net-of-fee)
  const damonGross = damonContrib.amount / (1 - entryFeeRate);
  const damonEntryFee = damonGross * entryFeeRate;
  const damonNet = damonGross - damonEntryFee;

  contributions.push({
    id: `damon_${damonContrib.date}`,
    owner: 'investor',
    name: 'Damon',
    type: 'investor_contribution',
    amount: damonNet,
    ts: damonContrib.date,
    earnsDollarDaysThisWindow: true
  });

  contributions.push({
    id: `damon_${damonContrib.date}_entry_fee`,
    owner: 'founders',
    name: 'Founders',
    type: 'founders_entry_fee',
    amount: damonEntryFee,
    ts: damonContrib.date,
    earnsDollarDaysThisWindow: true
  });

  return {
    window: {
      start: '2025-07-22',
      end: '2025-09-06'
    },
    constants: {
      INVESTOR_SEED_BASELINE: 0,  // Start from $0 - user inputs data via OCR scans
      ENTRY_FEE_RATE: 0.10,
      MGMT_FEE_RATE: 0.20,
      FOUNDERS_MOONBAG_PCT: 0.75,
      FOUNDERS_COUNT: 2,
      ENTRY_FEE_REDUCES_INVESTOR_CREDIT: true
    },
    contributions
  };
};