import { AllocationEngine } from '@/lib/allocationEngine';
import { getDefaultSeed, convertSeedToLegs } from '@/config/defaultSeed';
import { AllocationState } from '@/types/allocation';

describe('Allocation engine invariants', () => {
  test('profit derivation and invariants hold with preset data', () => {
    // Arrange: seed + wallet/unrealized for the window
    const seed = getDefaultSeed();
    const legs = convertSeedToLegs(seed);

    const state: AllocationState = {
      window: seed.window,
      walletSizeEndOfWindow: 26005,
      unrealizedPnlEndOfWindow: 52.3,
      contributions: legs,
      constants: seed.constants
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
    const moonbagTotal = outputs.moonbag.founders +
      Object.values(outputs.moonbag.investors).reduce((a, b) => a + b, 0);
    expect(moonbagTotal).toBeCloseTo(state.unrealizedPnlEndOfWindow, 2);

    // Validate dollar-days are positive
    expect(outputs.dollarDays.total).toBeGreaterThan(0);
    expect(outputs.dollarDays.founders).toBeGreaterThan(0);

    // Validate shares sum to 1
    const totalShares = outputs.shares.founders +
      Object.values(outputs.shares.investors).reduce((a, b) => a + b, 0);
    expect(totalShares).toBeCloseTo(1, 5);
  });

  test('entry fee expansion works correctly', () => {
    const seed = getDefaultSeed();
    const legs = convertSeedToLegs(seed);

    // Should have more legs than original contributions due to entry fee expansion
    expect(legs.length).toBeGreaterThan(seed.contributions.length);

    // Check that net-of-fee investors generated entry fee legs
    const entryFeeLegs = legs.filter(leg => leg.type === 'founders_entry_fee');
    const netOfFeeInvestors = seed.contributions.filter(c =>
      c.netRule === 'net-of-fee' && c.owner === 'investor'
    );

    expect(entryFeeLegs.length).toBe(netOfFeeInvestors.length);

    // Verify each entry fee leg corresponds to a net investor contribution
    entryFeeLegs.forEach(feeLeg => {
      expect(feeLeg.owner).toBe('founders');
      expect(feeLeg.name).toBe('Founders');
      expect(feeLeg.amount).toBeGreaterThan(0);
    });
  });

  test('validation catches common errors', () => {
    const seed = getDefaultSeed();
    const legs = convertSeedToLegs(seed);

    const state: AllocationState = {
      window: seed.window,
      walletSizeEndOfWindow: 26005,
      unrealizedPnlEndOfWindow: 52.3,
      contributions: legs,
      constants: seed.constants
    };

    const outputs = AllocationEngine.recompute(state);
    const validationErrors = AllocationEngine.validate(state, outputs);

    // Should pass validation with correct data
    expect(validationErrors.filter(e => e.type === 'error')).toHaveLength(0);
  });
});