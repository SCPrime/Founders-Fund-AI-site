'use client';

export default function EntryFeeBreakdown() {
  return (
    <div className="panel">
      <h2>Entry Fee Breakdown — Routed to Founders (10%)</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Investor</th>
              <th className="right">Entry fees — Pre-start</th>
              <th className="right">Entry fees — In window</th>
              <th className="right">Total entry fees</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="muted">
                No entry fee data
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="small">
        Entry fees are capital transfers to Founders.
      </div>
    </div>
  );
}
