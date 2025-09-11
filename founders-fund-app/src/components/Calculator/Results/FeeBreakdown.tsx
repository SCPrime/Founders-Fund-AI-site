'use client';

export default function FeeBreakdown() {
  return (
    <div className="panel">
      <h2>Fee Breakdown — Investors (base profit only)</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Investor</th>
              <th className="right">Base profit share</th>
              <th className="right">Fee rate</th>
              <th className="right">Fee amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="muted">
                No fee data
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="small" id="feeNotes"></div>
    </div>
  );
}
