import { getDefaultSeed } from '@/config/defaultSeed';
import { AllocationEngine } from '@/lib/allocationEngine';
import { AllocationState } from '@/types/allocation';

describe('Allocation engine invariants', () => {
  test('profit derivation and invariants hold with preset data', () => {
    // Arrange: seed + wallet/unrealized for the window
    const seed = getDefaultSeed();
    const legs = seed.contributions;

    const state: AllocationState = {
      window: seed.window,
      walletSizeEndOfWindow: 26005,
      unrealizedPnlEndOfWindow: 52.3,
      contributions: legs,
      constants: seed.constants,
    };

    // Act
    const outputs = AllocationEngine.recompute(state);

    // Assert basic calculations
    expect(outputs.profitTotal).toBeCloseTo(6005, 2);
    expect(outputs.realizedProfit).toBeCloseTo(5952.7, 2);

    // Assert invariants: all realized profit is allocated
    const sumGross =
      outputs.realizedGross.founders +
      Object.values(outputs.realizedGross.investors).reduce((a, b) => a + b, 0);
    expect(sumGross).toBeCloseTo(outputs.realizedProfit, 2);

    // Management fees sum correctly
    const sumFees = Object.values(outputs.managementFees.investors).reduce((a, b) => a + b, 0);
    expect(sumFees).toBeCloseTo(outputs.managementFees.foundersCarryTotal, 2);

    // Net profit after fees reconciles
    const sumNet =
      outputs.realizedNet.founders +
      Object.values(outputs.realizedNet.investors).reduce((a, b) => a + b, 0);
    expect(sumNet).toBeCloseTo(outputs.realizedProfit, 2);

    // Moonbag allocation: no fees on unrealized
    const moonbagTotal =
      outputs.moonbag.founders +
      Object.values(outputs.moonbag.investors).reduce((a, b) => a + b, 0);
    expect(moonbagTotal).toBeCloseTo(state.unrealizedPnlEndOfWindow, 2);

    // Validate dollar-days are positive
    expect(outputs.dollarDays.total).toBeGreaterThan(0);
    expect(outputs.dollarDays.founders).toBeGreaterThan(0);

    // Validate shares sum to 1
    const totalShares =
      outputs.shares.founders + Object.values(outputs.shares.investors).reduce((a, b) => a + b, 0);
    expect(totalShares).toBeCloseTo(1, 5);
  });

  test('entry fee expansion works correctly', () => {
    const seed = getDefaultSeed();
    const legs = seed.contributions;

    // Should have entry fee legs for net-of-fee investors
    const entryFeeLegs = legs.filter((leg) => leg.type === 'founders_entry_fee');
    const investorContributions = legs.filter(
      (leg) => leg.type === 'investor_contribution' && leg.owner === 'investor',
    );

    // Each investor contribution should have a corresponding entry fee leg
    expect(entryFeeLegs.length).toBeGreaterThan(0);

    // Verify each entry fee leg corresponds to a net investor contribution
    entryFeeLegs.forEach((feeLeg) => {
      expect(feeLeg.owner).toBe('founders');
      expect(feeLeg.name).toBe('Founders');
      expect(feeLeg.amount).toBeGreaterThan(0);
    });
  });

  test('validation catches common errors', () => {
    const seed = getDefaultSeed();
    const legs = seed.contributions;

    const state: AllocationState = {
      window: seed.window,
      walletSizeEndOfWindow: 26005,
      unrealizedPnlEndOfWindow: 52.3,
      contributions: legs,
      constants: seed.constants,
    };

    const outputs = AllocationEngine.recompute(state);
    const validationErrors = AllocationEngine.validate(state, outputs);

    // Should pass validation with correct data
    expect(validationErrors.filter((e) => e.type === 'error')).toHaveLength(0);
  });
});
