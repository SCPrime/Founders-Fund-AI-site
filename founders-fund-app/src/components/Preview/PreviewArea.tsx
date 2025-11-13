'use client';

import { ExportPDFButton } from '@/components/Reports/ExportPDFButton';
import { useAllocationStore } from '@/store/allocationStore';
import { useState } from 'react';

export default function PreviewArea() {
  const { outputs, state } = useAllocationStore();
  const [previewMode, setPreviewMode] = useState<'summary' | 'detailed'>('summary');

  if (!outputs || !state) {
    return (
      <div className="panel">
        <p className="muted">No allocation data to preview. Run a calculation first.</p>
      </div>
    );
  }

  // Extract founders and investors from outputs
  const founders = Object.entries(
    outputs.shares.founders ? { Founders: outputs.shares.founders } : {},
  ).map(([name, shares]) => ({
    name,
    shares: typeof shares === 'number' ? shares : 0,
    endCapital: outputs.endCapital.founders || 0,
  }));
  const investors = Object.entries(outputs.shares.investors || {}).map(([name, shares]) => ({
    name,
    shares: typeof shares === 'number' ? shares : 0,
    endCapital: outputs.endCapital.investors[name] || 0,
  }));

  return (
    <div className="panel">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Allocation Preview</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(previewMode === 'summary' ? 'detailed' : 'summary')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
          >
            {previewMode === 'summary' ? 'Show Details' : 'Show Summary'}
          </button>
          <ExportPDFButton
            reportType="individual-investor"
            allocationState={state}
            allocationOutputs={outputs}
            filename={`allocation-preview-${new Date().toISOString().split('T')[0]}.pdf`}
            label="Export PDF"
          />
        </div>
      </div>

      {previewMode === 'summary' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">Total Founders</div>
              <div className="text-2xl font-bold">{founders.length}</div>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">Total Investors</div>
              <div className="text-2xl font-bold">{investors.length}</div>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">Total Realized Profit</div>
              <div className="text-2xl font-bold text-green-400">
                $
                {Number(outputs.realizedProfit || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <div className="text-sm text-gray-400">Total End Capital</div>
              <div className="text-2xl font-bold">
                $
                {Number(
                  (outputs.endCapital.founders || 0) +
                    Object.values(outputs.endCapital.investors || {}).reduce(
                      (sum, val) => sum + (typeof val === 'number' ? val : 0),
                      0,
                    ),
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Founders Allocation</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Shares</th>
                    <th className="text-right p-2">End Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {founders.map(
                    (
                      founder: { name: string; shares: number; endCapital: number },
                      idx: number,
                    ) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="p-2">{founder.name}</td>
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
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Investors Allocation</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Shares</th>
                    <th className="text-right p-2">End Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {investors.map(
                    (
                      investor: { name: string; shares: number; endCapital: number },
                      idx: number,
                    ) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="p-2">{investor.name}</td>
                        <td className="text-right p-2">
                          {Number(investor.shares || 0).toFixed(4)}%
                        </td>
                        <td className="text-right p-2">
                          $
                          {Number(investor.endCapital || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
