'use client';

export default function FeesByClass() {
  return (
    <div className="panel">
      <h2>Fees by Class — Founders & Investors</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Class / Name</th>
              <th className="right">Base profit share</th>
              <th className="right">Mgmt fee role</th>
              <th className="right">Mgmt fee rate</th>
              <th className="right">Mgmt fee amount (±)</th>
              <th className="right">Entry fees this window (±)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="muted">
                No fee class data
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="small">
        Founders receive investor fees; investors pay 20% of positive base shares; no fee on moonbag.
      </div>
    </div>
  );
}
