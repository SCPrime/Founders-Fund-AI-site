import { describe, it, expect, beforeEach } from 'vitest';
import { AllocationEngine } from './allocationEngine';
import { AllocationState } from '@/types/allocation';
import { getDefaultConstants, createSeedDataset } from '@/utils/allocationUtils';

describe('AllocationEngine', () => {
  let baseState: AllocationState;

  beforeEach(() => {
    baseState = {
      window: {
        start: '2025-07-10',
        end: '2025-12-31'
      },
      walletSizeEndOfWindow: 50000,
      unrealizedPnlEndOfWindow: 15000,
      contributions: createSeedDataset(), // Founders seed: $5,000 on 2025-07-10
      constants: getDefaultConstants()
    };
  });

  describe('Profit Derivation (Rule 1)', () => {
    it('should calculate profit_total = wallet_size_end - 20,000', () => {
      const outputs = AllocationEngine.recompute(baseState);
      expect(outputs.profitTotal).toBe(50000 - 20000); // 30,000
    });

    it('should calculate realized_profit = profit_total - unrealized_pnl', () => {
      const outputs = AllocationEngine.recompute(baseState);
      expect(outputs.realizedProfit).toBe(30000 - 15000); // 15,000
    });
  });

  describe('Dollar-Days Calculation (Rule 3)', () => {
    it('should calculate correct dollar-days for founders seed', () => {
      // Founders seed: $5,000 from 2025-07-10 to 2025-12-31
      // Days: July 10-31 (22 days) + Aug (31) + Sep (30) + Oct (31) + Nov (30) + Dec (31) = 175 days
      const outputs = AllocationEngine.recompute(baseState);

      // Calculate expected days: 2025-07-10 to 2025-12-31 inclusive
      const startDate = new Date('2025-07-10');
      const endDate = new Date('2025-12-31');
      const diffTime = endDate.getTime() - startDate.getTime();
      const expectedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive

      expect(outputs.dollarDays.founders).toBe(5000 * expectedDays);
      expect(outputs.dollarDays.total).toBe(5000 * expectedDays);
    });

    it('should give 0 dollar-days for contributions on window end', () => {
      const stateWithEndContrib = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'end_contrib',
            owner: 'investor' as const,
            name: 'Test Investor',
            type: 'investor_contribution' as const,
            amount: 10000,
            ts: '2025-12-31', // Window end date
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithEndContrib);

      // Should only have founders dollar-days, no investor DD
      expect(outputs.dollarDays.investors['Test Investor']).toBeUndefined();
    });
  });

  describe('Entry Fee Expansion (Rule 2)', () => {
    it('should create founders entry fee legs for investor contributions', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 9000, // Net amount after 10% fee (gross would be 10,000)
            ts: '2025-08-01',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      // Should have created a founders entry fee leg
      const entryFeeLegs = outputs.expandedLegs.filter(leg => leg.type === 'founders_entry_fee');
      expect(entryFeeLegs).toHaveLength(1);
      expect(entryFeeLegs[0].amount).toBe(1000); // 10% of 10,000 gross
      expect(entryFeeLegs[0].ts).toBe('2025-08-01');
    });
  });

  describe('Shares Calculation (Rule 4)', () => {
    it('should allocate shares based on dollar-days proportion', () => {
      const outputs = AllocationEngine.recompute(baseState);

      // Only founders have dollar-days in base case
      expect(outputs.shares.founders).toBe(1.0);
      expect(Object.keys(outputs.shares.investors)).toHaveLength(0);
    });

    it('should split shares correctly with multiple parties', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500, // Net after 10% fee (gross 5,000)
            ts: '2025-07-10', // Same start date as founders
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      // Both should have same dollar-days (same amount, same time)
      // But founders also get the entry fee
      const expectedFoundersDD = outputs.dollarDays.founders;
      const expectedInvestorDD = outputs.dollarDays.investors['Laura'];
      const totalDD = expectedFoundersDD + expectedInvestorDD;

      expect(outputs.shares.founders).toBeCloseTo(expectedFoundersDD / totalDD, 5);
      expect(outputs.shares.investors['Laura']).toBeCloseTo(expectedInvestorDD / totalDD, 5);
      expect(outputs.shares.founders + outputs.shares.investors['Laura']).toBeCloseTo(1.0, 5);
    });
  });

  describe('Realized Profit Allocation (Rule 5)', () => {
    it('should apply 20% management fee to investor gross shares only', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      // Investor should pay 20% mgmt fee on their gross share
      const investorGross = outputs.realizedGross.investors['Laura'];
      const expectedMgmtFee = investorGross * 0.20;

      expect(outputs.managementFees.investors['Laura']).toBeCloseTo(expectedMgmtFee, 2);
      expect(outputs.managementFees.foundersCarryTotal).toBeCloseTo(expectedMgmtFee, 2);
    });

    it('should not apply management fee to founders shares', () => {
      const outputs = AllocationEngine.recompute(baseState);

      // Founders should get their full gross share + any carry
      expect(outputs.realizedNet.founders).toBe(outputs.realizedGross.founders);
    });

    it('should set management fees to 0 when realized profit is negative', () => {
      const stateWithLoss = {
        ...baseState,
        walletSizeEndOfWindow: 15000, // Loss scenario
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithLoss);

      expect(outputs.realizedProfit).toBeLessThan(0);
      expect(outputs.managementFees.foundersCarryTotal).toBe(0);
      expect(outputs.managementFees.investors['Laura']).toBe(0);
    });
  });

  describe('Moonbag Allocation (Rule 7)', () => {
    it('should allocate 75% to founders, 25% to investors', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      const expectedFoundersMoonbag = 15000 * 0.75; // 11,250
      const expectedInvestorsMoonbag = 15000 * 0.25; // 3,750

      expect(outputs.moonbag.founders).toBeCloseTo(expectedFoundersMoonbag, 2);
      expect(outputs.moonbag.investors['Laura']).toBeCloseTo(expectedInvestorsMoonbag, 2);
    });

    it('should split investor moonbag pro-rata by investor dollar-days only', () => {
      const stateWithTwoInvestors = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          },
          {
            id: 'investor_2',
            owner: 'investor' as const,
            name: 'Damon',
            type: 'investor_contribution' as const,
            amount: 9000, // Double Laura's amount
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithTwoInvestors);

      const totalInvestorMoonbag = 15000 * 0.25; // 3,750
      const lauraDD = outputs.dollarDays.investors['Laura'];
      const damonDD = outputs.dollarDays.investors['Damon'];
      const totalInvestorDD = lauraDD + damonDD;

      const expectedLauraMoonbag = (lauraDD / totalInvestorDD) * totalInvestorMoonbag;
      const expectedDamonMoonbag = (damonDD / totalInvestorDD) * totalInvestorMoonbag;

      expect(outputs.moonbag.investors['Laura']).toBeCloseTo(expectedLauraMoonbag, 2);
      expect(outputs.moonbag.investors['Damon']).toBeCloseTo(expectedDamonMoonbag, 2);
      expect(expectedDamonMoonbag).toBeCloseTo(expectedLauraMoonbag * 2, 2); // Damon should get 2x Laura
    });
  });

  describe('Validation Rules', () => {
    it('should pass all validations for valid scenario', () => {
      const outputs = AllocationEngine.recompute(baseState);
      const errors = AllocationEngine.validate(baseState, outputs);

      const criticalErrors = errors.filter(e => e.type === 'error');
      expect(criticalErrors).toHaveLength(0);
    });

    it('should validate sum of gross realized equals total realized', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      const foundersGross = outputs.realizedGross.founders;
      const investorGross = outputs.realizedGross.investors['Laura'];
      const totalGross = foundersGross + investorGross;

      expect(totalGross).toBeCloseTo(outputs.realizedProfit, 2);
    });

    it('should validate sum of net realized equals total realized', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      const foundersNet = outputs.realizedNet.founders;
      const investorNet = outputs.realizedNet.investors['Laura'];
      const totalNet = foundersNet + investorNet;

      expect(totalNet).toBeCloseTo(outputs.realizedProfit, 2);
    });

    it('should validate moonbag sum equals unrealized PnL', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      const totalMoonbag = outputs.moonbag.founders + outputs.moonbag.investors['Laura'];
      expect(totalMoonbag).toBeCloseTo(baseState.unrealizedPnlEndOfWindow, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero dollar-days scenario', () => {
      const stateWithNoContribs = {
        ...baseState,
        contributions: [] // No contributions
      };

      const outputs = AllocationEngine.recompute(stateWithNoContribs);

      expect(outputs.dollarDays.total).toBe(0);
      expect(outputs.shares.founders).toBe(0);
      expect(outputs.realizedGross.founders).toBe(0);
      expect(outputs.realizedNet.founders).toBe(0);
    });

    it('should handle negative realized profit', () => {
      const stateWithLoss = {
        ...baseState,
        walletSizeEndOfWindow: 10000, // Big loss
        unrealizedPnlEndOfWindow: 0
      };

      const outputs = AllocationEngine.recompute(stateWithLoss);

      expect(outputs.realizedProfit).toBe(-10000);
      expect(outputs.managementFees.foundersCarryTotal).toBe(0);

      // Founders should bear the loss
      expect(outputs.realizedNet.founders).toBeLessThan(0);
    });

    it('should handle zero unrealized PnL', () => {
      const stateWithNoMoonbag = {
        ...baseState,
        unrealizedPnlEndOfWindow: 0
      };

      const outputs = AllocationEngine.recompute(stateWithNoMoonbag);

      expect(outputs.moonbag.founders).toBe(0);
      expect(Object.keys(outputs.moonbag.investors)).toHaveLength(0);
      expect(outputs.moonbagLegs).toHaveLength(0);
    });
  });

  describe('What-If Analysis', () => {
    it('should calculate impact of new contribution', () => {
      const newContribution = {
        owner: 'investor' as const,
        name: 'New Investor',
        type: 'investor_contribution' as const,
        amount: 9000,
        ts: '2025-08-01',
        earnsDollarDaysThisWindow: true
      };

      const impact = AllocationEngine.addContributionImpact(baseState, newContribution);

      expect(impact.before.shares.founders).toBe(1.0);
      expect(impact.after.shares.founders).toBeLessThan(1.0);
      expect(impact.after.shares.investors['New Investor']).toBeGreaterThan(0);

      // Founders should lose some share due to dilution
      expect(impact.impact.sharesChange.founders).toBeLessThan(0);
    });
  });

  describe('Derived Legs Creation', () => {
    it('should create founders mgmt fee leg for next window', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      expect(outputs.foundersMgmtLeg).toBeTruthy();
      expect(outputs.foundersMgmtLeg!.type).toBe('founders_mgmt_fee');
      expect(outputs.foundersMgmtLeg!.amount).toBe(outputs.managementFees.foundersCarryTotal);
      expect(outputs.foundersMgmtLeg!.ts).toBe(baseState.window.end);
      expect(outputs.foundersMgmtLeg!.earnsDollarDaysThisWindow).toBe(false);
    });

    it('should create moonbag legs for next window', () => {
      const stateWithInvestor = {
        ...baseState,
        contributions: [
          ...baseState.contributions,
          {
            id: 'investor_1',
            owner: 'investor' as const,
            name: 'Laura',
            type: 'investor_contribution' as const,
            amount: 4500,
            ts: '2025-07-10',
            earnsDollarDaysThisWindow: true
          }
        ]
      };

      const outputs = AllocationEngine.recompute(stateWithInvestor);

      expect(outputs.moonbagLegs).toHaveLength(2); // Founders + Laura

      const foundersLeg = outputs.moonbagLegs.find(leg => leg.type === 'moonbag_founders');
      const investorLeg = outputs.moonbagLegs.find(leg => leg.type === 'moonbag_investor');

      expect(foundersLeg).toBeTruthy();
      expect(foundersLeg!.amount).toBe(outputs.moonbag.founders);
      expect(foundersLeg!.earnsDollarDaysThisWindow).toBe(false);

      expect(investorLeg).toBeTruthy();
      expect(investorLeg!.amount).toBe(outputs.moonbag.investors['Laura']);
      expect(investorLeg!.earnsDollarDaysThisWindow).toBe(false);
    });
  });
});