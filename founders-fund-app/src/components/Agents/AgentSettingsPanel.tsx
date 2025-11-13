'use client';

import { useState } from 'react';

interface AgentSettingsPanelProps {
  agentId: string;
  currentStrategy: Record<string, unknown>;
  onClose: () => void;
  onUpdate: () => void;
  onError?: (error: string) => void;
}

export default function AgentSettingsPanel({
  agentId,
  currentStrategy,
  onClose,
  onUpdate,
  onError: _onError,
}: AgentSettingsPanelProps) {
  const [strategy, setStrategy] = useState(JSON.stringify(currentStrategy, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveStrategy = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Validate JSON
      let parsedStrategy;
      try {
        parsedStrategy = JSON.parse(strategy);
      } catch {
        throw new Error('Invalid JSON format');
      }

      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: parsedStrategy }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update strategy');
      }

      setSuccessMessage('Strategy updated successfully!');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update strategy');
    } finally {
      setLoading(false);
    }
  };

  const handleResetStrategy = () => {
    setStrategy(JSON.stringify(currentStrategy, null, 2));
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Agent Settings</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
          ×
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trading Strategy (JSON)
        </label>
        <textarea
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          rows={20}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter strategy JSON..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Edit the strategy JSON to modify trading rules, risk management, and indicators.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600 text-xl">⚠️</span>
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Warning</p>
            <p>
              Modifying the strategy will affect future trades. Existing positions will not be
              affected. Make sure to validate your JSON before saving.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleResetStrategy}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveStrategy}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
