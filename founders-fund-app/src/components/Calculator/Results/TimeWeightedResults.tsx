'use client';

export default function TimeWeightedResults() {
  return (
    <div className="panel">
      <h2>Results (time-weighted)</h2>
      <div className="small">KPI placeholder</div>
      <div className="tablewrap">
        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th>Class / Name</th>
              <th className="right">Start-of-window capital</th>
              <th className="right">Contribs in window</th>
              <th className="right">Dollar-days (weight)</th>
              <th className="right">TW Share %</th>
              <th className="right">Base profit share</th>
              <th className="right">Regular fund fee (20%)</th>
              <th className="right">Moonbag (realized)</th>
              <th className="right">Draws</th>
              <th className="right">Net Profit (after fees)</th>
              <th className="right">PGP (period %)</th>
              <th className="right">End capital</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={12} className="muted">
                No results yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="small" id="domNote"></div>
    </div>
  );
}
