import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  AllocationState,
  AllocationOutputs,
  CashflowLeg,
  TrendRow,
  ValidationError,
  AllocationSnapshot,
  AllocationConstants
} from '@/types/allocation';
import { AllocationEngine } from '@/lib/allocationEngine';
import { getDefaultConstants, createSeedDataset } from '@/utils/allocationUtils';
import { getDefaultSeed } from '@/config/defaultSeed';

interface BootState {
  hasBootstrapped: boolean;
  lastAppliedScreenshotId?: string;
}

interface WalletCapture {
  size?: number | null;
  unrealized?: number | null;
  source: 'none' | 'screenshot' | 'manual';
  lastUpdateAt?: string;
  lastAppliedScreenshotId?: string;
}

interface AllocationStore {
  // Core state
  state: AllocationState;
  outputs: AllocationOutputs | null;
  validationErrors: ValidationError[];

  // Historical data
  trendRows: TrendRow[];
  snapshots: AllocationSnapshot[];

  // Bootstrap and wallet state
  boot: BootState;
  wallet: WalletCapture;

  // UI state
  isComputing: boolean;
  lastComputeTime: string | null;

  // Actions
  updateWindow: (window: { start: string; end: string }) => void;
  updateWalletSize: (amount: number) => void;
  updateUnrealizedPnl: (amount: number) => void;
  updateConstants: (constants: Partial<AllocationConstants>) => void;

  // Bootstrap and wallet actions
  ensureDefaultLoaded: () => void;
  saveScreenshot: (payload: { imageId: string; walletSize: number; unrealized: number; capturedAt: string }) => void;
  setBoot: (boot: Partial<BootState>) => void;
  hasAnySnapshot: () => boolean;

  // Contribution management
  addContribution: (contribution: Omit<CashflowLeg, 'id'>) => void;
  updateContribution: (id: string, updates: Partial<CashflowLeg>) => void;
  removeContribution: (id: string) => void;
  clearContributions: () => void;
  loadSeedData: () => void;

  // Computation
  recompute: () => void;
  saveSnapshot: () => void;

  // What-if analysis
  runWhatIf: (modifications: Partial<AllocationState>) => AllocationOutputs;
  calculateContributionImpact: (contribution: Omit<CashflowLeg, 'id'>) => {
    before: AllocationOutputs;
    after: AllocationOutputs;
    impact: {
      dollarDaysChange: { founders: number; investors: Record<string, number> };
      sharesChange: { founders: number; investors: Record<string, number> };
      realizedNetChange: { founders: number; investors: Record<string, number> };
    };
  };

  // Data management
  loadSnapshot: (snapshotId: string) => void;
  exportData: () => string;
  importData: (data: string) => void;

  // Reset
  reset: () => void;
}

const getInitialState = (): AllocationState => ({
  window: {
    start: '2025-07-22',
    end: '2025-09-06'
  },
  walletSizeEndOfWindow: 0, // Will be set by screenshot
  unrealizedPnlEndOfWindow: 0, // Will be set by screenshot
  contributions: [], // Will be populated by bootstrap
  constants: getDefaultConstants()
});

const getInitialBootState = (): BootState => ({
  hasBootstrapped: false,
  lastAppliedScreenshotId: undefined
});

const getInitialWalletState = (): WalletCapture => ({
  size: null,
  unrealized: null,
  source: 'none',
  lastUpdateAt: undefined,
  lastAppliedScreenshotId: undefined
});

export const useAllocationStore = create<AllocationStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    state: getInitialState(),
    outputs: null,
    validationErrors: [],
    trendRows: [],
    snapshots: [],
    boot: getInitialBootState(),
    wallet: getInitialWalletState(),
    isComputing: false,
    lastComputeTime: null,

    // Update window
    updateWindow: (window) => {
      set((state) => ({
        state: { ...state.state, window }
      }));
      get().recompute();
    },

    // Update wallet size (legacy - prefer saveScreenshot)
    updateWalletSize: (amount) => {
      set((state) => ({
        state: { ...state.state, walletSizeEndOfWindow: amount },
        wallet: { ...state.wallet, size: amount, source: 'manual' }
      }));
      get().recompute();
    },

    // Update unrealized PnL (legacy - prefer saveScreenshot)
    updateUnrealizedPnl: (amount) => {
      set((state) => ({
        state: { ...state.state, unrealizedPnlEndOfWindow: amount },
        wallet: { ...state.wallet, unrealized: amount, source: 'manual' }
      }));
      get().recompute();
    },

    // Update constants
    updateConstants: (constants) => {
      set((state) => ({
        state: {
          ...state.state,
          constants: { ...state.state.constants, ...constants }
        }
      }));
      get().recompute();
    },

    // Add contribution
    addContribution: (contribution) => {
      const newContribution: CashflowLeg = {
        ...contribution,
        id: `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      set((state) => ({
        state: {
          ...state.state,
          contributions: [...state.state.contributions, newContribution]
        }
      }));
      get().recompute();
    },

    // Update contribution
    updateContribution: (id, updates) => {
      set((state) => ({
        state: {
          ...state.state,
          contributions: state.state.contributions.map(contrib =>
            contrib.id === id ? { ...contrib, ...updates } : contrib
          )
        }
      }));
      get().recompute();
    },

    // Remove contribution
    removeContribution: (id) => {
      set((state) => ({
        state: {
          ...state.state,
          contributions: state.state.contributions.filter(contrib => contrib.id !== id)
        }
      }));
      get().recompute();
    },

    // Clear all contributions
    clearContributions: () => {
      set((state) => ({
        state: {
          ...state.state,
          contributions: []
        }
      }));
      get().recompute();
    },

    // Load seed data (legacy)
    loadSeedData: () => {
      set((state) => ({
        state: {
          ...state.state,
          contributions: createSeedDataset()
        }
      }));
      get().recompute();
    },

    // Ensure default loaded (bootstrap)
    ensureDefaultLoaded: () => {
      const { boot, snapshots } = get();
      if (!boot.hasBootstrapped && snapshots.length === 0) {
        const seed = getDefaultSeed();

        set((state) => ({
          state: {
            ...state.state,
            window: seed.window,
            constants: seed.constants,
            contributions: seed.contributions
          },
          boot: { ...state.boot, hasBootstrapped: true }
        }));

        get().recompute();
      }
    },

    // Save screenshot with wallet data
    saveScreenshot: (payload) => {
      const { wallet } = get();

      // Only apply if this is a new screenshot
      if (wallet.lastAppliedScreenshotId !== payload.imageId) {
        set((state) => ({
          state: {
            ...state.state,
            walletSizeEndOfWindow: payload.walletSize,
            unrealizedPnlEndOfWindow: payload.unrealized
          },
          wallet: {
            ...state.wallet,
            size: payload.walletSize,
            unrealized: payload.unrealized,
            source: 'screenshot',
            lastUpdateAt: payload.capturedAt,
            lastAppliedScreenshotId: payload.imageId
          }
        }));

        get().recompute();
      }
    },

    // Set boot state
    setBoot: (boot) => {
      set((state) => ({
        boot: { ...state.boot, ...boot }
      }));
    },

    // Check if any snapshots exist
    hasAnySnapshot: () => {
      return get().snapshots.length > 0;
    },

    // Main recompute function
    recompute: () => {
      const { state } = get();

      set({ isComputing: true });

      try {
        // Run the allocation engine
        const outputs = AllocationEngine.recompute(state);

        // Validate results
        const validationErrors = AllocationEngine.validate(state, outputs);

        set({
          outputs,
          validationErrors,
          isComputing: false,
          lastComputeTime: new Date().toISOString()
        });

        // Log summary for debugging
        console.log('Allocation recomputed:', {
          profitTotal: outputs.profitTotal,
          realizedProfit: outputs.realizedProfit,
          dollarDaysTotal: outputs.dollarDays.total,
          foundersShare: outputs.shares.founders,
          mgmtFeesTotal: outputs.managementFees.foundersCarryTotal,
          validationErrors: validationErrors.length
        });

      } catch (error) {
        console.error('Allocation computation failed:', error);
        set({
          validationErrors: [{
            type: 'error',
            field: 'computation',
            message: error instanceof Error ? error.message : 'Unknown computation error'
          }],
          isComputing: false
        });
      }
    },

    // Save snapshot
    saveSnapshot: () => {
      const { state, outputs, validationErrors } = get();

      if (!outputs) {
        console.warn('Cannot save snapshot - no outputs available');
        return;
      }

      const { trendRow, auditLegs, snapshot } = AllocationEngine.saveSnapshot(
        state,
        outputs,
        validationErrors
      );

      set((current) => ({
        trendRows: [...current.trendRows, trendRow],
        snapshots: [...current.snapshots, snapshot],
        // Add audit legs to current contributions for next window
        state: {
          ...current.state,
          contributions: [...current.state.contributions, ...auditLegs]
        }
      }));

      console.log('Snapshot saved:', snapshot.id);
    },

    // What-if analysis
    runWhatIf: (modifications) => {
      const { state } = get();
      return AllocationEngine.whatIf(state, modifications);
    },

    // Calculate contribution impact
    calculateContributionImpact: (contribution) => {
      const { state } = get();
      return AllocationEngine.addContributionImpact(state, contribution);
    },

    // Load snapshot
    loadSnapshot: (snapshotId) => {
      const { snapshots } = get();
      const snapshot = snapshots.find(s => s.id === snapshotId);

      if (!snapshot) {
        console.warn('Snapshot not found:', snapshotId);
        return;
      }

      set({
        state: snapshot.state,
        outputs: snapshot.outputs,
        validationErrors: snapshot.validationErrors
      });

      console.log('Snapshot loaded:', snapshotId);
    },

    // Export data
    exportData: () => {
      const { state, outputs, trendRows, snapshots } = get();
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        state,
        outputs,
        trendRows,
        snapshots
      };
      return JSON.stringify(exportData, null, 2);
    },

    // Import data
    importData: (data) => {
      try {
        const parsed = JSON.parse(data);

        if (parsed.version !== '1.0') {
          throw new Error('Unsupported data version');
        }

        set({
          state: parsed.state,
          outputs: parsed.outputs || null,
          trendRows: parsed.trendRows || [],
          snapshots: parsed.snapshots || [],
          validationErrors: []
        });

        // Recompute to ensure consistency
        get().recompute();

        console.log('Data imported successfully');
      } catch (error) {
        console.error('Import failed:', error);
        throw new Error('Failed to import data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    },

    // Reset to initial state
    reset: () => {
      set({
        state: getInitialState(),
        outputs: null,
        validationErrors: [],
        trendRows: [],
        snapshots: [],
        boot: getInitialBootState(),
        wallet: getInitialWalletState(),
        isComputing: false,
        lastComputeTime: null
      });
      get().recompute();
    }
  }))
);

// Auto-recompute when certain state changes occur
useAllocationStore.subscribe(
  (state) => state.state,
  () => {
    // Debounce rapid changes
    const timeoutId = setTimeout(() => {
      useAllocationStore.getState().recompute();
    }, 100);

    return () => clearTimeout(timeoutId);
  },
  { fireImmediately: false }
);

// Selectors for derived data
export const allocationSelectors = {
  // Current allocation summary
  getAllocationSummary: () => {
    const { outputs } = useAllocationStore.getState();
    if (!outputs) return null;

    return {
      totalProfit: outputs.profitTotal,
      realizedProfit: outputs.realizedProfit,
      unrealizedProfit: outputs.profitTotal - outputs.realizedProfit,
      foundersShare: outputs.shares.founders,
      foundersRealizedNet: outputs.realizedNet.founders,
      totalMgmtFees: outputs.managementFees.foundersCarryTotal,
      totalInvestors: Object.keys(outputs.dollarDays.investors).length
    };
  },

  // Individual investor view
  getInvestorView: (investorName: string) => {
    const { outputs } = useAllocationStore.getState();
    if (!outputs) return null;

    return {
      dollarDays: outputs.dollarDays.investors[investorName] || 0,
      share: outputs.shares.investors[investorName] || 0,
      realizedGross: outputs.realizedGross.investors[investorName] || 0,
      realizedNet: outputs.realizedNet.investors[investorName] || 0,
      managementFee: outputs.managementFees.investors[investorName] || 0,
      moonbag: outputs.moonbag.investors[investorName] || 0,
      endCapital: outputs.endCapital.investors[investorName] || 0
    };
  },

  // Performance metrics
  getPerformanceMetrics: () => {
    const { outputs, state } = useAllocationStore.getState();
    if (!outputs) return null;

    const totalCapitalDeployed = state.constants.INVESTOR_SEED_BASELINE;
    const currentValue = state.walletSizeEndOfWindow;
    const totalReturn = (currentValue - totalCapitalDeployed) / totalCapitalDeployed;

    return {
      totalReturn,
      realizedReturn: outputs.realizedProfit / totalCapitalDeployed,
      unrealizedReturn: (outputs.profitTotal - outputs.realizedProfit) / totalCapitalDeployed,
      mgmtFeeRate: outputs.managementFees.foundersCarryTotal / Math.max(outputs.realizedProfit, 1),
      dollarDaysUtilization: outputs.dollarDays.total
    };
  }
};