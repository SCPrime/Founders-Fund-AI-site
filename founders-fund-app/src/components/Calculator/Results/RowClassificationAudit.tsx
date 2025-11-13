'use client';

import { useAllocationStore } from '@/store/allocationStore';

export default function RowClassificationAudit() {
  const { state } = useAllocationStore();
  const contributions = state.contributions || [];

  // Classify contributions
  const classified = contributions.map((contrib) => {
    const isFounder = contrib.owner === 'founders';
    // CashflowLeg doesn't have rule/cls - determine from type
    const isNet = contrib.type === 'investor_contribution' || contrib.type === 'seed';
    const isGross = contrib.type === 'founders_entry_fee' || contrib.type === 'founders_mgmt_fee';

    return {
      ...contrib,
      classification: isFounder
        ? isNet
          ? 'Founder (Net)'
          : 'Founder (Gross)'
        : isNet
          ? 'Investor (Net)'
          : 'Investor (Gross)',
      category: isFounder ? 'Founder' : 'Investor',
      ruleType: isNet ? 'Net' : 'Gross',
    };
  });

  const byCategory = classified.reduce(
    (acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byRule = classified.reduce(
    (acc, c) => {
      acc[c.ruleType] = (acc[c.ruleType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="panel">
      <h2>Audit — Row Classification</h2>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-800 rounded">
            <div className="text-sm text-gray-400">Total Contributions</div>
            <div className="text-2xl font-bold">{contributions.length}</div>
          </div>
          <div className="p-4 bg-gray-800 rounded">
            <div className="text-sm text-gray-400">Unique Participants</div>
            <div className="text-2xl font-bold">
              {new Set(contributions.map((c) => c.name)).size}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Classification Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm text-gray-400 mb-1">By Category</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Founders:</span>
                  <span className="font-medium">{byCategory.Founder || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Investors:</span>
                  <span className="font-medium">{byCategory.Investor || 0}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm text-gray-400 mb-1">By Rule Type</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Net:</span>
                  <span className="font-medium">{byRule.Net || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross:</span>
                  <span className="font-medium">{byRule.Gross || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Detailed Classification</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-left p-2">Classification</th>
                </tr>
              </thead>
              <tbody>
                {classified.map((c, idx) => (
                  <tr key={idx} className="border-b border-gray-800">
                    <td className="p-2">{c.name}</td>
                    <td className="p-2">{c.ts}</td>
                    <td className="text-right p-2">
                      $
                      {Number(c.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          c.category === 'Founder'
                            ? 'bg-blue-900 text-blue-200'
                            : 'bg-green-900 text-green-200'
                        }`}
                      >
                        {c.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
