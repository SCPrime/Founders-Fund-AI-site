'use client';

import { useAllocationStore } from '@/store/allocationStore';

interface InvestorEntryFee {
  name: string;
  preStartFees: number;
  inWindowFees: number;
  totalFees: number;
}

export default function EntryFeeBreakdown() {
  const { state, outputs } = useAllocationStore();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate entry fees from actual contribution legs
  const calculateEntryFees = (): InvestorEntryFee[] => {
    const windowStart = new Date(state.window.start);
    const entryFeeLegs = state.contributions.filter(leg => leg.type === 'founders_entry_fee');

    if (entryFeeLegs.length === 0) {
      return [];
    }

    // Group by investor name (extract from leg.id which has format like "laura_2025-07-22_0_entry_fee")
    const feesByInvestor: Record<string, InvestorEntryFee> = {};

    entryFeeLegs.forEach(leg => {
      // Extract investor name from the corresponding net contribution
      const baseLegId = leg.id.replace('_entry_fee', '');
      const netLeg = state.contributions.find(c => c.id === baseLegId + '_net');
      const investorName = netLeg?.name || 'Unknown';

      if (!feesByInvestor[investorName]) {
        feesByInvestor[investorName] = {
          name: investorName,
          preStartFees: 0,
          inWindowFees: 0,
          totalFees: 0
        };
      }

      const legDate = new Date(leg.ts);
      if (legDate < windowStart) {
        feesByInvestor[investorName].preStartFees += leg.amount;
      } else {
        feesByInvestor[investorName].inWindowFees += leg.amount;
      }
      feesByInvestor[investorName].totalFees += leg.amount;
    });

    return Object.values(feesByInvestor);
  };

  const entryFees = calculateEntryFees();
  const totalPreStart = entryFees.reduce((sum, fee) => sum + fee.preStartFees, 0);
  const totalInWindow = entryFees.reduce((sum, fee) => sum + fee.inWindowFees, 0);
  const totalEntryFees = entryFees.reduce((sum, fee) => sum + fee.totalFees, 0);

  return (
    <div className="panel">
      <h2>🎯 Entry Fee Breakdown</h2>
      <p className="small">
        Entry fees ({(state.constants.ENTRY_FEE_RATE * 100).toFixed(0)}%) paid by investors to founders
      </p>

      {entryFees.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontStyle: 'italic'
        }}>
          No entry fees calculated. Add investor contributions to see breakdown.
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Investor</th>
                <th>Pre-start Fees</th>
                <th>In-window Fees</th>
                <th>Total Fees</th>
              </tr>
            </thead>
            <tbody>
              {entryFees.map((fee, idx) => (
                <tr key={idx}>
                  <td><strong>{fee.name}</strong></td>
                  <td data-testid="entry-fees-prestart-total">{formatCurrency(fee.preStartFees)}</td>
                  <td data-testid="entry-fees-inwindow-total">{formatCurrency(fee.inWindowFees)}</td>
                  <td>{formatCurrency(fee.totalFees)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td><strong>Totals</strong></td>
                <td><strong>{formatCurrency(totalPreStart)}</strong></td>
                <td><strong>{formatCurrency(totalInWindow)}</strong></td>
                <td><strong>{formatCurrency(totalEntryFees)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {outputs && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'var(--ink)',
          borderRadius: '6px',
          fontSize: '13px',
          color: 'var(--muted)'
        }}>
          <strong>Summary:</strong> Total entry fees of {formatCurrency(totalEntryFees)} go to founders immediately upon investment.
          These fees are included in founders&apos; dollar-days calculation but do not reduce investor capital credited.
        </div>
      )}
    </div>
  );
}