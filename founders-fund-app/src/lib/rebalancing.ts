/**
 * Portfolio Rebalancing System
 *
 * Automated portfolio rebalancing based on target allocations
 * Supports time-based and threshold-based rebalancing triggers
 */

export interface TargetAllocation {
  symbol: string;
  targetPercent: number; // Target allocation percentage (0-100)
  minPercent?: number; // Minimum allocation before rebalancing
  maxPercent?: number; // Maximum allocation before rebalancing
}

export interface CurrentPosition {
  symbol: string;
  amount: number;
  price: number;
  value: number;
  currentPercent: number; // Current allocation percentage
}

export interface RebalanceConfig {
  portfolioId: string;
  targetAllocations: TargetAllocation[];
  totalValue: number;
  rebalanceThreshold?: number; // Percentage deviation before rebalancing (default: 5%)
  minRebalanceAmount?: number; // Minimum dollar amount to trigger rebalancing
}

export interface RebalanceAction {
  symbol: string;
  action: 'BUY' | 'SELL';
  currentAmount: number;
  targetAmount: number;
  difference: number;
  value: number;
  reason: string;
}

export interface RebalanceResult {
  config: RebalanceConfig;
  currentPositions: CurrentPosition[];
  actions: RebalanceAction[];
  totalRebalanceValue: number;
  estimatedFees: number;
  needsRebalancing: boolean;
}

export class RebalancingEngine {
  /**
   * Calculate rebalancing actions needed
   */
  static calculateRebalance(
    config: RebalanceConfig,
    currentPositions: CurrentPosition[],
  ): RebalanceResult {
    const threshold = config.rebalanceThreshold || 5; // 5% default
    const minRebalanceAmount = config.minRebalanceAmount || 100; // $100 default

    const actions: RebalanceAction[] = [];
    let totalRebalanceValue = 0;

    // Calculate target values for each allocation
    const targetValues = config.targetAllocations.map((target) => ({
      ...target,
      targetValue: (config.totalValue * target.targetPercent) / 100,
    }));

    // Match current positions with targets
    for (const target of targetValues) {
      const currentPosition = currentPositions.find((p) => p.symbol === target.symbol);
      const currentValue = currentPosition?.value || 0;
      const currentPercent = currentPosition?.currentPercent || 0;
      const targetValue = target.targetValue;
      const targetPercent = target.targetPercent;

      // Check if rebalancing is needed
      const deviation = Math.abs(currentPercent - targetPercent);
      const valueDifference = targetValue - currentValue;

      if (deviation > threshold && Math.abs(valueDifference) >= minRebalanceAmount) {
        const action: RebalanceAction = {
          symbol: target.symbol,
          action: valueDifference > 0 ? 'BUY' : 'SELL',
          currentAmount: currentPosition?.amount || 0,
          targetAmount: targetValue / (currentPosition?.price || 1),
          difference: Math.abs(valueDifference),
          value: Math.abs(valueDifference),
          reason: `Deviation: ${deviation.toFixed(2)}% (threshold: ${threshold}%)`,
        };

        actions.push(action);
        totalRebalanceValue += Math.abs(valueDifference);
      }
    }

    // Check for positions that should be closed (not in target allocations)
    for (const position of currentPositions) {
      const hasTarget = config.targetAllocations.some((t) => t.symbol === position.symbol);
      if (!hasTarget && position.value >= minRebalanceAmount) {
        actions.push({
          symbol: position.symbol,
          action: 'SELL',
          currentAmount: position.amount,
          targetAmount: 0,
          difference: position.value,
          value: position.value,
          reason: 'Position not in target allocations',
        });
        totalRebalanceValue += position.value;
      }
    }

    // Estimate fees (0.1% per trade)
    const estimatedFees = totalRebalanceValue * 0.001 * actions.length;

    return {
      config,
      currentPositions,
      actions,
      totalRebalanceValue,
      estimatedFees,
      needsRebalancing: actions.length > 0,
    };
  }

  /**
   * Check if portfolio needs rebalancing (time-based)
   */
  static needsTimeBasedRebalance(lastRebalanceDate: Date, rebalanceIntervalDays: number): boolean {
    const daysSinceRebalance = Math.floor(
      (Date.now() - lastRebalanceDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysSinceRebalance >= rebalanceIntervalDays;
  }

  /**
   * Check if portfolio needs rebalancing (threshold-based)
   */
  static needsThresholdRebalance(
    currentPositions: CurrentPosition[],
    targetAllocations: TargetAllocation[],
    threshold: number = 5,
  ): boolean {
    for (const target of targetAllocations) {
      const position = currentPositions.find((p) => p.symbol === target.symbol);
      const currentPercent = position?.currentPercent || 0;
      const deviation = Math.abs(currentPercent - target.targetPercent);

      if (deviation > threshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate optimal rebalancing order
   * Prioritizes selling before buying to free up capital
   */
  static optimizeRebalanceOrder(actions: RebalanceAction[]): RebalanceAction[] {
    const sellActions = actions.filter((a) => a.action === 'SELL');
    const buyActions = actions.filter((a) => a.action === 'BUY');

    // Sort sells by value (largest first)
    sellActions.sort((a, b) => b.value - a.value);

    // Sort buys by value (largest first)
    buyActions.sort((a, b) => b.value - a.value);

    return [...sellActions, ...buyActions];
  }

  /**
   * Validate rebalance configuration
   */
  static validateConfig(config: RebalanceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.portfolioId) {
      errors.push('Portfolio ID is required');
    }

    if (!config.targetAllocations || config.targetAllocations.length === 0) {
      errors.push('Target allocations are required');
    }

    if (config.totalValue <= 0) {
      errors.push('Total portfolio value must be greater than 0');
    }

    // Check that allocations sum to ~100%
    const totalPercent = config.targetAllocations.reduce(
      (sum, target) => sum + target.targetPercent,
      0,
    );

    if (Math.abs(totalPercent - 100) > 1) {
      errors.push(`Target allocations must sum to 100% (currently ${totalPercent.toFixed(2)}%)`);
    }

    // Check for duplicate symbols
    const symbols = config.targetAllocations.map((t) => t.symbol);
    const duplicates = symbols.filter((s, i) => symbols.indexOf(s) !== i);
    if (duplicates.length > 0) {
      errors.push(`Duplicate symbols in target allocations: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
