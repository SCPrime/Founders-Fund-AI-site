'use client';

import { useAllocationStore } from '@/store/allocationStore';

export default function Audit() {
  const { outputs, state } = useAllocationStore();

  // Extract founders data from AllocationOutputs structure
  const founderShare = outputs?.shares?.founders || 0;
  const founderEndCapital = outputs?.endCapital?.founders || 0;
  const founderRealizedNet = outputs?.realizedNet?.founders || 0;
  const founderMoonbag = outputs?.moonbag?.founders || 0;

  // Calculate total founder contributions (filter by owner='founders')
  const totalFounderContributions = (state.contributions || [])
    .filter((c) => c.owner === 'founders')
    .reduce((sum: number, c) => sum + Number(c.amount), 0);

  // Extract founders list from contributions
  const founders = Array.from(
    new Set((state.contributions || []).filter((c) => c.owner === 'founders').map((c) => c.name)),
  ).map((name) => ({
    name,
    shares: founderShare,
    endCapital: founderEndCapital,
  }));

  // Math validation - shares should sum to 1.0 (100%)
  const totalShares =
    founderShare +
    (outputs?.shares?.investors
      ? Object.values(outputs.shares.investors).reduce((sum: number, val: number) => sum + val, 0)
      : 0);
  const sharesSumValid = Math.abs(totalShares - 1.0) < 0.01;

  // End capital validation
  const totalEndCapital =
    founderEndCapital +
    (outputs?.endCapital?.investors
      ? Object.values(outputs.endCapital.investors).reduce(
          (sum: number, val: number) => sum + val,
          0,
        )
      : 0);
  const endCapitalMatches =
    Math.abs(totalEndCapital - (outputs?.profitTotal || 0) - totalFounderContributions) < 1;

  return (
    <div className="panel">
      <h2>Founders Audit — Composition & Math</h2>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded">
            <div className="text-sm text-gray-400">Founder Share</div>
            <div className="text-2xl font-bold">{(founderShare * 100).toFixed(4)}%</div>
          </div>
          <div className="p-4 bg-gray-800 rounded">
            <div className="text-sm text-gray-400">Total Shares</div>
            <div className="text-2xl font-bold">{(totalShares * 100).toFixed(4)}%</div>
          </div>
          <div className="p-4 bg-gray-800 rounded">
            <div className="text-sm text-gray-400">Founder End Capital</div>
            <div className="text-2xl font-bold">
              $
              {founderEndCapital.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Math Validation</h3>
          <div className="space-y-2">
            <div
              className={`p-3 rounded border ${
                sharesSumValid ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Shares Sum to 100%</span>
                <span className={sharesSumValid ? 'text-green-400' : 'text-red-400'}>
                  {sharesSumValid ? '✓' : '✗'} {(totalShares * 100).toFixed(4)}%
                </span>
              </div>
            </div>
            <div
              className={`p-3 rounded border ${
                endCapitalMatches
                  ? 'bg-green-900/20 border-green-700'
                  : 'bg-red-900/20 border-red-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>End Capital Calculation</span>
                <span className={endCapitalMatches ? 'text-green-400' : 'text-red-400'}>
                  {endCapitalMatches ? '✓' : '✗'} Valid
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Founders Composition</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">Contributions</th>
                  <th className="text-right p-2">Shares</th>
                  <th className="text-right p-2">End Capital</th>
                  <th className="text-right p-2">Return %</th>
                </tr>
              </thead>
              <tbody>
                {founders.map(
                  (founder: { name: string; shares: number; endCapital: number }, idx: number) => {
                    const contributions = (state.contributions || [])
                      .filter((c) => c.name === founder.name && c.owner === 'founders')
                      .reduce((sum: number, c) => sum + Number(c.amount), 0);
                    const returnPct =
                      contributions > 0
                        ? ((Number(founder.endCapital) - contributions) / contributions) * 100
                        : 0;

                    return (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="p-2">{founder.name}</td>
                        <td className="text-right p-2">
                          $
                          {contributions.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right p-2">
                          {Number(founder.shares || 0).toFixed(4)}%
                        </td>
                        <td className="text-right p-2">
                          $
                          {Number(founder.endCapital || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`text-right p-2 font-medium ${
                            returnPct >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {returnPct >= 0 ? '+' : ''}
                          {returnPct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
