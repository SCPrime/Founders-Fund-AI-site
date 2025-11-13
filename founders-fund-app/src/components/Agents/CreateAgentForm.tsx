'use client';

import React, { useState } from 'react';

interface TradingStrategy {
  name: string;
  description: string;
  riskProfile: string;
  entryRules: string[];
  exitRules: string[];
  positionSizing: Record<string, unknown>;
  riskManagement: Record<string, unknown>;
  indicators: string[];
  timeframes: string[];
  tradingHours: string;
  notes: string;
}

interface CreateAgentFormProps {
  portfolioId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateAgentForm({ portfolioId, onSuccess, onCancel }: CreateAgentFormProps) {
  const [step, setStep] = useState<'basic' | 'strategy' | 'review'>('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [allocation, setAllocation] = useState('');
  const [strategyPrompt, setStrategyPrompt] = useState('');
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [strategy, setStrategy] = useState<TradingStrategy | null>(null);

  const handleGenerateStrategy = async () => {
    if (!strategyPrompt.trim()) {
      setError('Please describe your desired strategy');
      return;
    }

    setGeneratingStrategy(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/create-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: strategyPrompt,
          symbol,
          allocation: parseFloat(allocation),
          riskTolerance
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate strategy');
      }

      const data = await response.json();
      setStrategy(data.strategy);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate strategy');
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!strategy) {
      setError('Strategy is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          name: name || `${symbol} Trader`,
          symbol: symbol.toUpperCase(),
          strategy,
          allocation: parseFloat(allocation)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create agent');
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Deploy New AI Trading Agent</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className={`h-1 rounded-full ${step === 'basic' || step === 'strategy' || step === 'review' ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          <p className="text-xs text-center mt-1 font-medium">Basic Info</p>
        </div>
        <div className="flex-1 mx-2">
          <div className={`h-1 rounded-full ${step === 'strategy' || step === 'review' ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          <p className="text-xs text-center mt-1 font-medium">Strategy</p>
        </div>
        <div className="flex-1">
          <div className={`h-1 rounded-full ${step === 'review' ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
          <p className="text-xs text-center mt-1 font-medium">Review</p>
        </div>
      </div>

      {/* Step 1: Basic Info */}
      {step === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pepe Alpha Trader"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coin Symbol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g., PEPE, DOGE, SHIB"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Allocation (USD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={allocation}
              onChange={(e) => setAllocation(e.target.value)}
              placeholder="e.g., 5000"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Tolerance
            </label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value as 'conservative' | 'moderate' | 'aggressive')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="conservative">Conservative - Low risk, steady returns</option>
              <option value="moderate">Moderate - Balanced approach</option>
              <option value="aggressive">Aggressive - High risk, high reward</option>
            </select>
          </div>

          <div className="flex gap-3 mt-6">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => setStep('strategy')}
              disabled={!symbol || !allocation}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Strategy Generation */}
      {step === 'strategy' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Describe Your Trading Strategy
            </label>
            <textarea
              value={strategyPrompt}
              onChange={(e) => setStrategyPrompt(e.target.value)}
              placeholder="Example: Create an aggressive momentum strategy that buys on breakouts above 24h high with volume confirmation and exits at 15% profit or 5% loss"
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about entry rules, exit criteria, risk management, and indicators you want to use.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('basic')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleGenerateStrategy}
              disabled={generatingStrategy || !strategyPrompt.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {generatingStrategy ? 'Generating with AI...' : 'Generate Strategy'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && strategy && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">{strategy.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Risk Profile:</span>
                <span className="ml-2 font-medium">{strategy.riskProfile}</span>
              </div>
              <div>
                <span className="text-gray-500">Indicators:</span>
                <span className="ml-2 font-medium">{strategy.indicators.join(', ')}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Entry Rules:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {strategy.entryRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Exit Rules:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {strategy.exitRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep('strategy')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreateAgent}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Deploying Agent...' : 'Deploy Agent'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
