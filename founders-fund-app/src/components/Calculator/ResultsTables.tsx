'use client';

import { useState } from 'react';
import RowClassificationAudit from './Results/RowClassificationAudit';
import TimeWeightedResults from './Results/TimeWeightedResults';
import AllocationResults from './Results/AllocationResults';
import FeeBreakdown from './Results/FeeBreakdown';
import EntryFeeBreakdown from './Results/EntryFeeBreakdown';
import FeesByClass from './Results/FeesByClass';
import DiagnosticsPanel from './Results/DiagnosticsPanel';

export default function ResultsTables() {
  const [showLegacyResults, setShowLegacyResults] = useState(false);

  return (
    <>
      {/* Main Results - Using AllocationStore */}
      <AllocationResults />

      {/* Toggle for Legacy Results */}
      <div style={{
        margin: '16px 0',
        padding: '12px',
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <button
          className="btn"
          onClick={() => setShowLegacyResults(!showLegacyResults)}
          style={{
            fontSize: '12px',
            padding: '6px 12px'
          }}
        >
          {showLegacyResults ? '🔼 Hide Legacy Results' : '🔽 Show Legacy Results (FundStore)'}
        </button>
        {showLegacyResults && (
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            Legacy results use the old FundStore system for comparison
          </div>
        )}
      </div>

      {/* Legacy Results - Using FundStore (for comparison/debugging) */}
      {showLegacyResults && (
        <>
          <RowClassificationAudit />
          <TimeWeightedResults />
          <FeeBreakdown />
          <EntryFeeBreakdown />
          <FeesByClass />
        </>
      )}

      <DiagnosticsPanel />
    </>
  );
}
