/**
 * CRITICAL VALIDATION TEST - Baseline Scenario from Figment Splits
 *
 * This test validates the AllocationEngine against the EXACT baseline scenario
 * from Figment Splits Calculator v2m.
 *
 * Expected Results (from manual calculation):
 * - Dollar-days: Founders 47,500 | Laura 81,000 | Damon 31,500
 * - Shares: Founders 29.69% | Laura 50.63% | Damon 19.69%
 * - Realized Net: Founders $656.31 | Laura $607.56 | Damon $236.28
 */

import { AllocationEngine } from '@/lib/allocationEngine';
import { AllocationState, CashflowLeg } from '@/types/allocation';

describe('AllocationEngine - Baseline Scenario Validation', () => {

  // Baseline scenario: Window Aug 30 - Sept 5, 2025 (7 days)
  const window = {
    start: '2025-08-30',
    end: '2025-09-05'
  };

  // All contributions (chronological order from Figment Splits)
  const contributions: CashflowLeg[] = [
    // Founders seed (July 10)
    {
      id: 'founders_seed',
      owner: 'founders',
      name: 'Founders',
      type: 'seed',
      amount: 5000,
      ts: '2025-07-10',
      earnsDollarDaysThisWindow: true
    },

    // Laura's deposits (GROSS amounts - 10% fee should be deducted)
    {
      id: 'laura_1',
      owner: 'investor',
      name: 'Laura',
      type: 'investor_contribution',
      amount: 5000, // GROSS (should become $4,500 net + $500 fee to founders)
      ts: '2025-07-22',
      earnsDollarDaysThisWindow: true
    },
    {
      id: 'laura_2',
      owner: 'investor',
      name: 'Laura',
      type: 'investor_contribution',
      amount: 5000, // GROSS
      ts: '2025-07-31',
      earnsDollarDaysThisWindow: true
    },
    {
      id: 'laura_3',
      owner: 'investor',
      name: 'Laura',
      type: 'investor_contribution',
      amount: 2500, // GROSS
      ts: '2025-08-25',
      earnsDollarDaysThisWindow: true
    },
    {
      id: 'laura_4',
      owner: 'investor',
      name: 'Laura',
      type: 'investor_contribution',
      amount: 2500, // GROSS (in-window contribution)
      ts: '2025-09-05',
      earnsDollarDaysThisWindow: true
    },

    // Damon's deposit
    {
      id: 'damon_1',
      owner: 'investor',
      name: 'Damon',
      type: 'investor_contribution',
      amount: 5000, // GROSS (should become $4,500 net + $500 fee to founders)
      ts: '2025-08-02',
      earnsDollarDaysThisWindow: true
    }
  ];

  const state: AllocationState = {
    window,
    walletSizeEndOfWindow: 26500, // $22,500 start + $2,500 in-window + $1,500 profit
    unrealizedPnlEndOfWindow: 0, // No moonbag in this scenario
    contributions,
    constants: {
      INVESTOR_SEED_BASELINE: 22500, // Total capital at window start
      ENTRY_FEE_RATE: 0.10,
      MGMT_FEE_RATE: 0.20,
      FOUNDERS_MOONBAG_PCT: 0.75,
      FOUNDERS_COUNT: 2,
      ENTRY_FEE_REDUCES_INVESTOR_CREDIT: true
    }
  };

  it('should calculate correct dollar-days', () => {
    const outputs = AllocationEngine.recompute(state);

    // Expected dollar-days (from manual calculation)
    expect(outputs.dollarDays.founders).toBeCloseTo(47500, 0);
    expect(outputs.dollarDays.investors['Laura']).toBeCloseTo(81000, 0);
    expect(outputs.dollarDays.investors['Damon']).toBeCloseTo(31500, 0);
    expect(outputs.dollarDays.total).toBeCloseTo(160000, 0);
  });

  it('should calculate correct shares', () => {
    const outputs = AllocationEngine.recompute(state);

    // Expected shares (EXACT calculation: dollar-days / total)
    expect(outputs.shares.founders).toBeCloseTo(0.296875, 6); // 47,500 / 160,000 = 29.6875%
    expect(outputs.shares.investors['Laura']).toBeCloseTo(0.50625, 6); // 81,000 / 160,000 = 50.625%
    expect(outputs.shares.investors['Damon']).toBeCloseTo(0.196875, 6); // 31,500 / 160,000 = 19.6875%
  });

  it('should calculate correct realized profit', () => {
    const outputs = AllocationEngine.recompute(state);

    // Total realized profit should be $1,500
    expect(outputs.realizedProfit).toBeCloseTo(1500, 2);
  });

  it('should calculate correct gross profit allocation', () => {
    const outputs = AllocationEngine.recompute(state);

    // Expected gross allocations (before management fees)
    // EXACT: $1,500 × share
    expect(outputs.realizedGross.founders).toBeCloseTo(445.3125, 4); // $1,500 × 0.296875
    expect(outputs.realizedGross.investors['Laura']).toBeCloseTo(759.375, 4); // $1,500 × 0.50625
    expect(outputs.realizedGross.investors['Damon']).toBeCloseTo(295.3125, 4); // $1,500 × 0.196875
  });

  it('should calculate correct management fees', () => {
    const outputs = AllocationEngine.recompute(state);

    // Management fees (20% of investor profits)
    // EXACT: gross × 0.20
    expect(outputs.managementFees.investors['Laura']).toBeCloseTo(151.875, 4); // $759.375 × 0.20
    expect(outputs.managementFees.investors['Damon']).toBeCloseTo(59.0625, 4); // $295.3125 × 0.20
    expect(outputs.managementFees.foundersCarryTotal).toBeCloseTo(210.9375, 4); // $151.875 + $59.0625
  });

  it('should calculate correct net profit allocation', () => {
    const outputs = AllocationEngine.recompute(state);

    // Expected net allocations (CRITICAL - must match exactly!)
    // EXACT: gross + carry (founders) or gross - fee (investors)
    expect(outputs.realizedNet.founders).toBeCloseTo(656.25, 4); // $445.3125 + $210.9375
    expect(outputs.realizedNet.investors['Laura']).toBeCloseTo(607.50, 4); // $759.375 - $151.875
    expect(outputs.realizedNet.investors['Damon']).toBeCloseTo(236.25, 4); // $295.3125 - $59.0625
  });

  it('should calculate correct end capitals', () => {
    const outputs = AllocationEngine.recompute(state);

    // Expected end capitals (EXACT calculation)
    // Founders: $6,750 start + $250 in-window fee + $656.25 profit = $7,656.25
    // Laura: $11,250 start + $2,250 in-window + $607.50 profit = $14,107.50
    // Damon: $4,500 start + $0 in-window + $236.25 profit = $4,736.25

    expect(outputs.endCapital.founders).toBeCloseTo(7656.25, 4);
    expect(outputs.endCapital.investors['Laura']).toBeCloseTo(14107.50, 4);
    expect(outputs.endCapital.investors['Damon']).toBeCloseTo(4736.25, 4);
  });

  it('should validate totals add up', () => {
    const outputs = AllocationEngine.recompute(state);

    // All net profits should sum to total profit
    const totalNetProfit =
      outputs.realizedNet.founders +
      Object.values(outputs.realizedNet.investors).reduce((sum, val) => sum + val, 0);

    expect(totalNetProfit).toBeCloseTo(1500, 2);

    // All end capitals should sum to wallet size
    const totalEndCapital =
      outputs.endCapital.founders +
      Object.values(outputs.endCapital.investors).reduce((sum, val) => sum + val, 0);

    expect(totalEndCapital).toBeCloseTo(26500, 2);
  });
});
