/**
 * Portfolio Rebalancing Panel
 *
 * UI for portfolio rebalancing
 */

'use client';

import type { CurrentPosition, RebalanceResult, TargetAllocation } from '@/lib/rebalancing';
import { useState } from 'react';

interface RebalancePanelProps {
  portfolioId: string;
  currentPositions: CurrentPosition[];
  totalValue: number;
}

export default function RebalancePanel({
  portfolioId,
  currentPositions,
  totalValue,
}: RebalancePanelProps) {
  const [targetAllocations, setTargetAllocations] = useState<TargetAllocation[]>([]);
  const [result, setResult] = useState<RebalanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculateRebalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          targetAllocations,
          currentPositions,
          totalValue,
          calculateOnly: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rebalancing calculation failed');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRebalance = async () => {
    if (!result) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          targetAllocations,
          currentPositions,
          totalValue,
          calculateOnly: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rebalancing execution failed');
      }

      alert('Rebalancing executed successfully!');
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const addTargetAllocation = () => {
    setTargetAllocations([...targetAllocations, { symbol: '', targetPercent: 0 }]);
  };

  const updateTargetAllocation = (index: number, updates: Partial<TargetAllocation>) => {
    const updated = [...targetAllocations];
    updated[index] = { ...updated[index], ...updates };
    setTargetAllocations(updated);
  };

  const removeTargetAllocation = (index: number) => {
    setTargetAllocations(targetAllocations.filter((_, i) => i !== index));
  };

  const totalTargetPercent = targetAllocations.reduce((sum, t) => sum + t.targetPercent, 0);

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Portfolio Rebalancing</h2>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Target Allocations</label>
            <button
              onClick={addTargetAllocation}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              + Add
            </button>
          </div>

          <div className="space-y-2">
            {targetAllocations.map((target, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Symbol"
                  value={target.symbol}
                  onChange={(e) => updateTargetAllocation(index, { symbol: e.target.value })}
                  className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded"
                />
                <input
                  type="number"
                  placeholder="%"
                  value={target.targetPercent}
                  onChange={(e) =>
                    updateTargetAllocation(index, { targetPercent: Number(e.target.value) })
                  }
                  className="w-24 p-2 bg-gray-800 border border-gray-700 rounded"
                />
                <button
                  onClick={() => removeTargetAllocation(index)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-2 text-sm text-gray-400">
            Total: {totalTargetPercent.toFixed(2)}%{' '}
            {totalTargetPercent !== 100 && '(Should be 100%)'}
          </div>
        </div>

        <button
          onClick={handleCalculateRebalance}
          disabled={loading || targetAllocations.length === 0}
          className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
        >
          {loading ? 'Calculating...' : 'Calculate Rebalancing'}
        </button>

        {error && (
          <div className="p-3 bg-red-900 border border-red-700 rounded text-red-200">{error}</div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-gray-800 rounded">
            <h3 className="text-xl font-bold mb-4">Rebalancing Plan</h3>

            {result.needsRebalancing ? (
              <>
                <div className="mb-4">
                  <div className="text-sm text-gray-400">Total Rebalance Value</div>
                  <div className="text-2xl font-bold">${result.totalRebalanceValue.toFixed(2)}</div>
                  <div className="text-sm text-gray-400">
                    Estimated Fees: ${result.estimatedFees.toFixed(2)}
                  </div>
                </div>

                <div className="space-y-2">
                  {result.actions.map((action, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded ${
                        action.action === 'BUY' ? 'bg-green-900' : 'bg-red-900'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold">{action.symbol}</div>
                          <div className="text-sm text-gray-400">{action.reason}</div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-bold ${action.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {action.action} ${action.value.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {action.currentAmount.toFixed(4)} → {action.targetAmount.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleExecuteRebalance}
                  disabled={loading}
                  className="mt-4 w-full p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-medium"
                >
                  {loading ? 'Executing...' : 'Execute Rebalancing'}
                </button>
              </>
            ) : (
              <div className="text-center text-gray-400">
                Portfolio is already balanced. No rebalancing needed.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
