'use client';

import { useEffect, useRef } from 'react';
import { useFundStore } from '@/store/fundStore';
import { useAllocationStore } from '@/store/allocationStore';

/**
 * StoreSynchronizer bridges the gap between FundStore and AllocationStore
 * to ensure data consistency across all components.
 *
 * Data Flow:
 * - AllocationStore is the PRIMARY store (used by forms, settings)
 * - FundStore is SECONDARY store (used by legacy results components)
 * - This component syncs AllocationStore -> FundStore
 */
export default function StoreSynchronizer() {
  const lastSyncRef = useRef<number>(0);

  // Primary store (AllocationStore)
  const allocationState = useAllocationStore((state) => state.state);
  const allocationOutputs = useAllocationStore((state) => state.outputs);
  // const allocationErrors = useAllocationStore((state) => state.validationErrors); // Future use
  const allocationLastCompute = useAllocationStore((state) => state.lastComputeTime);

  // Secondary store (FundStore)
  const {
    updateSettings,
    populateContributions,
    // recompute: fundRecompute // Future use for bidirectional sync
  } = useFundStore();

  useEffect(() => {
    // Prevent infinite loops by checking if sync is needed
    const currentTime = Date.now();
    if (currentTime - lastSyncRef.current < 100) {
      return; // Debounce syncing
    }

    try {
      // Sync AllocationStore -> FundStore
      console.log('[StoreSynchronizer] Syncing AllocationStore -> FundStore');

      // 1. Sync Settings
      const fundSettings = {
        view: 'week' as const,
        winStart: allocationState.window.start,
        winEnd: allocationState.window.end,
        walletSize: allocationState.walletSizeEndOfWindow,
        realizedProfit: allocationOutputs?.realizedProfit || 0,
        moonbagReal: 0,
        moonbagUnreal: allocationState.unrealizedPnlEndOfWindow,
        includeUnreal: allocationState.unrealizedPnlEndOfWindow > 0 ? 'yes' as const : 'no' as const,
        moonbagFounderPct: allocationState.constants.FOUNDERS_MOONBAG_PCT * 100,
        mgmtFeePct: allocationState.constants.MGMT_FEE_RATE * 100,
        entryFeePct: allocationState.constants.ENTRY_FEE_RATE * 100,
        feeReducesInvestor: allocationState.constants.ENTRY_FEE_REDUCES_INVESTOR_CREDIT ? 'yes' as const : 'no' as const,
        founderCount: allocationState.constants.FOUNDERS_COUNT,
        drawPerFounder: 0,
        applyDraws: 'no' as const,
        domLeadPct: 0
      };

      updateSettings(fundSettings);

      // 2. Sync Contributions
      const fundContributions = allocationState.contributions
        .filter(leg => leg.type === 'seed' || leg.type === 'investor_contribution')
        .map(leg => ({
          name: leg.name,
          date: leg.ts,
          amount: leg.amount,
          rule: 'net' as const,
          cls: leg.owner === 'founders' ? 'founder' as const : 'investor' as const
        }));

      populateContributions(fundContributions);

      lastSyncRef.current = currentTime;

      console.log('[StoreSynchronizer] Sync complete', {
        settings: Object.keys(fundSettings).length,
        contributions: fundContributions.length
      });

    } catch (error) {
      console.error('[StoreSynchronizer] Sync failed:', error);
    }
  }, [
    allocationState.window,
    allocationState.walletSizeEndOfWindow,
    allocationState.unrealizedPnlEndOfWindow,
    allocationState.contributions,
    allocationState.constants,
    allocationOutputs?.realizedProfit,
    allocationLastCompute,
    updateSettings,
    populateContributions
  ]);

  return null; // This component only handles synchronization
}