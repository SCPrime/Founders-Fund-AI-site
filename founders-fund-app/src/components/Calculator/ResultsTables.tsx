'use client';

import RowClassificationAudit from './Results/RowClassificationAudit';
import TimeWeightedResults from './Results/TimeWeightedResults';
import FeeBreakdown from './Results/FeeBreakdown';
import EntryFeeBreakdown from './Results/EntryFeeBreakdown';
import FeesByClass from './Results/FeesByClass';
import DiagnosticsPanel from './Results/DiagnosticsPanel';

export default function ResultsTables() {
  return (
    <>
      <RowClassificationAudit />
      <TimeWeightedResults />
      <FeeBreakdown />
      <EntryFeeBreakdown />
      <FeesByClass />
      <DiagnosticsPanel />
    </>
  );
}
