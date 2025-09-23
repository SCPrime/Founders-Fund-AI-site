import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  Contribution,
  FundSettings,
  CalculatedResult,
  CalculationSummary,
  ValidationIssue,
  FundSnapshot,
  ContributionClass,
  ContributionRule
} from '@/types/fund';
import { calculateFundSplit } from '@/lib/calculations';

interface FundStore {
  // State
  contributions: Contribution[];
  settings: FundSettings;
  results: CalculatedResult[];
  summary: CalculationSummary;
  validationIssues: ValidationIssue[];
  lastCalculated: Date | null;
  isCalculating: boolean;

  // Actions - Contributions
  addContribution: (contribution: Omit<Contribution, 'id'>) => void;
  updateContribution: (id: string, updates: Partial<Contribution>) => void;
  removeContribution: (id: string) => void;
  clearContributions: () => void;
  populateContributions: (contributions: Omit<Contribution, 'id'>[]) => void;

  // Actions - Settings
  updateSettings: (updates: Partial<FundSettings>) => void;
  resetSettings: () => void;

  // Actions - Calculations
  recompute: () => void;
  simulate: (changes: {
    contributions?: Contribution[];
    settings?: Partial<FundSettings>;
  }) => { results: CalculatedResult[], summary: CalculationSummary };

  // Actions - Validation
  validateData: () => ValidationIssue[];
  clearValidationIssues: () => void;

  // Actions - Snapshots
  getSnapshot: () => FundSnapshot;
  loadSnapshot: (snapshot: FundSnapshot) => void;

  // Actions - Utilities
  getContributionsByClass: (cls: ContributionClass) => Contribution[];
  getResultsByClass: (cls: ContributionClass) => CalculatedResult[];
  getTotalContributionsByClass: (cls: ContributionClass) => number;
}

// Default settings
const defaultSettings: FundSettings = {
  view: 'week',
  winStart: '2025-07-22',
  winEnd: '2025-09-06',
  walletSize: 25000,
  realizedProfit: 20000,
  moonbagReal: 0,
  moonbagUnreal: 0,
  includeUnreal: 'no',
  moonbagFounderPct: 75,
  mgmtFeePct: 20,
  entryFeePct: 10,
  feeReducesInvestor: 'yes',
  founderCount: 2,
  drawPerFounder: 0,
  applyDraws: 'no',
  domLeadPct: 0
};

// Default empty summary
const defaultSummary: CalculationSummary = {
  totalContributions: 0,
  totalDollarDays: 0,
  totalBaseProfitShare: 0,
  totalFees: 0,
  totalNetProfit: 0,
  windowDays: 0,
  totalMgmtFeesCollected: 0,
  totalEntryFeesCollected: 0,
  totalMoonbagDistributed: 0,
  totalDraws: 0
};

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useFundStore = create<FundStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      contributions: [
        // Default founder entry
        {
          id: 'founder-seed',
          name: 'Founders',
          date: '2025-07-10',
          amount: 5000,
          rule: 'net' as ContributionRule,
          cls: 'founder' as ContributionClass
        }
      ],
      settings: defaultSettings,
      results: [],
      summary: defaultSummary,
      validationIssues: [],
      lastCalculated: null,
      isCalculating: false,

      // Contribution actions
      addContribution: (contribution) => {
        set((state) => ({
          contributions: [
            ...state.contributions,
            {
              ...contribution,
              id: generateId()
            }
          ]
        }));
        get().recompute();
      },

      updateContribution: (id, updates) => {
        set((state) => ({
          contributions: state.contributions.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        }));
        get().recompute();
      },

      removeContribution: (id) => {
        set((state) => ({
          contributions: state.contributions.filter(c => c.id !== id)
        }));
        get().recompute();
      },

      clearContributions: () => {
        set({ contributions: [] });
        get().recompute();
      },

      populateContributions: (contributions) => {
        set({
          contributions: contributions.map(c => ({
            ...c,
            id: generateId()
          }))
        });
        get().recompute();
      },

      // Settings actions
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates }
        }));
        get().recompute();
      },

      resetSettings: () => {
        set({ settings: { ...defaultSettings } });
        get().recompute();
      },

      // Calculation actions
      recompute: () => {
        const state = get();

        set({ isCalculating: true });

        try {
          const { results, summary } = calculateFundSplit(
            state.contributions,
            state.settings
          );

          set({
            results,
            summary,
            lastCalculated: new Date(),
            isCalculating: false
          });

          // Run validation after calculation
          get().validateData();
        } catch (error) {
          console.error('Calculation error:', error);
          set((state) => ({
            isCalculating: false,
            validationIssues: [
              ...state.validationIssues,
              {
                id: 'calc-error',
                type: 'error',
                message: `Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ]
          }));
        }
      },

      simulate: (changes) => {
        const state = get();
        const testContributions = changes.contributions || state.contributions;
        const testSettings = { ...state.settings, ...changes.settings };

        return calculateFundSplit(testContributions, testSettings);
      },

      // Validation actions
      validateData: () => {
        const state = get();
        const issues: ValidationIssue[] = [];

        // Validation rule 1: Check for duplicate names
        const nameGroups: { [key: string]: Contribution[] } = {};
        state.contributions.forEach(contrib => {
          const key = `${contrib.name}_${contrib.cls}`;
          if (!nameGroups[key]) nameGroups[key] = [];
          nameGroups[key].push(contrib);
        });

        Object.entries(nameGroups).forEach(([key, contribs]) => {
          if (contribs.length > 1) {
            issues.push({
              id: `duplicate-${key}`,
              type: 'warning',
              message: `Multiple entries for ${contribs[0].name} (${contribs[0].cls}). Consider consolidating.`
            });
          }
        });

        // Validation rule 2: Check for contributions outside window
        const windowEnd = new Date(state.settings.winEnd);

        state.contributions.forEach(contrib => {
          const contribDate = new Date(contrib.date);
          if (contribDate > windowEnd) {
            issues.push({
              id: `future-contrib-${contrib.id}`,
              type: 'warning',
              field: 'date',
              message: `${contrib.name}'s contribution on ${contrib.date} is after window end (${state.settings.winEnd})`
            });
          }
        });

        // Validation rule 3: Check for negative amounts
        state.contributions.forEach(contrib => {
          if (contrib.amount <= 0) {
            issues.push({
              id: `invalid-amount-${contrib.id}`,
              type: 'error',
              field: 'amount',
              message: `${contrib.name} has invalid amount: $${contrib.amount}`
            });
          }
        });

        // Validation rule 4: Check profit distribution adds up
        const totalProfitDistributed = state.results.reduce((sum, r) => sum + r.baseProfitShare, 0);
        const profitDifference = Math.abs(totalProfitDistributed - state.settings.realizedProfit);
        if (profitDifference > 0.01) { // Allow for small rounding errors
          issues.push({
            id: 'profit-mismatch',
            type: 'error',
            message: `Profit distribution mismatch: Distributed $${totalProfitDistributed.toFixed(2)} vs Expected $${state.settings.realizedProfit.toFixed(2)}`
          });
        }

        set({ validationIssues: issues });
        return issues;
      },

      clearValidationIssues: () => {
        set({ validationIssues: [] });
      },

      // Snapshot actions
      getSnapshot: () => {
        const state = get();
        return {
          contributions: [...state.contributions],
          settings: { ...state.settings },
          results: [...state.results],
          summary: { ...state.summary },
          validationIssues: [...state.validationIssues],
          lastCalculated: state.lastCalculated || new Date()
        };
      },

      loadSnapshot: (snapshot) => {
        set({
          contributions: [...snapshot.contributions],
          settings: { ...snapshot.settings },
          results: [...snapshot.results],
          summary: { ...snapshot.summary },
          validationIssues: [...snapshot.validationIssues],
          lastCalculated: snapshot.lastCalculated
        });
      },

      // Utility actions
      getContributionsByClass: (cls) => {
        return get().contributions.filter(c => c.cls === cls);
      },

      getResultsByClass: (cls) => {
        return get().results.filter(r => r.cls === cls);
      },

      getTotalContributionsByClass: (cls) => {
        return get().contributions
          .filter(c => c.cls === cls)
          .reduce((sum, c) => sum + c.amount, 0);
      }
    })),
    {
      name: 'fund-store'
    }
  )
);

// Auto-recompute when contributions or settings change
let timeoutId: NodeJS.Timeout | null = null;

useFundStore.subscribe(
  (state) => [state.contributions, state.settings],
  () => {
    // Debounce recompute to avoid excessive calculations
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const store = useFundStore.getState();
      if (!store.isCalculating) {
        store.recompute();
      }
    }, 100);
  },
  { fireImmediately: false }
);