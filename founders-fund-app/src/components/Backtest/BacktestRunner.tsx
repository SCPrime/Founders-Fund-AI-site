/**
 * Backtest Runner Component
 *
 * UI for running backtest simulations
 */

'use client';

import type { BacktestConfig, BacktestResult } from '@/lib/backtestEngine';
import { fetchHistoricalData } from '@/lib/historicalDataGenerator';
import { useState } from 'react';

export default function BacktestRunner() {
  const [config, setConfig] = useState<Partial<BacktestConfig>>({
    strategy: 'MACD',
    initialCapital: 10000,
    positionSize: 0.1,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    symbol: 'PEPE',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [symbol] = useState('PEPE');
  const [chain] = useState('ethereum');
  const [address] = useState('');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch historical data from price feed API
      const days = Math.ceil(
        (new Date(config.endDate || Date.now()).getTime() -
          new Date(config.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()) /
          (24 * 60 * 60 * 1000),
      );

      const historicalData = await fetchHistoricalData(
        config.symbol || symbol,
        chain || undefined,
        address || undefined,
        Math.max(days, 7), // Minimum 7 days
      );

      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            ...config,
            symbol: config.symbol || symbol,
            startDate:
              config.startDate ||
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: config.endDate || new Date().toISOString().split('T')[0],
          },
          historicalData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Backtest failed');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Backtest Trading Strategy</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="backtest-strategy" className="block text-sm font-medium mb-2">
            Strategy
          </label>
          <select
            id="backtest-strategy"
            value={config.strategy || 'MACD'}
            onChange={(e) => setConfig({ ...config, strategy: e.target.value as any })}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            aria-label="Select backtest strategy"
          >
            <option value="MACD">MACD</option>
            <option value="RSI">RSI</option>
            <option value="MACD_RSI_COMBO">MACD + RSI Combo</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="backtest-initial-capital" className="block text-sm font-medium mb-2">
              Initial Capital ($)
            </label>
            <input
              id="backtest-initial-capital"
              type="number"
              value={config.initialCapital || 0}
              onChange={(e) => setConfig({ ...config, initialCapital: Number(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
              aria-label="Initial capital in dollars"
            />
          </div>

          <div>
            <label htmlFor="backtest-position-size" className="block text-sm font-medium mb-2">
              Position Size (0-1)
            </label>
            <input
              id="backtest-position-size"
              type="number"
              step="0.01"
              value={config.positionSize || 0}
              onChange={(e) => setConfig({ ...config, positionSize: Number(e.target.value) })}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
              aria-label="Position size between 0 and 1"
            />
          </div>
        </div>

        {config.strategy === 'MACD' || config.strategy === 'MACD_RSI_COMBO' ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="backtest-macd-fast" className="block text-sm font-medium mb-2">
                MACD Fast
              </label>
              <input
                id="backtest-macd-fast"
                type="number"
                value={config.macdFast || 12}
                onChange={(e) => setConfig({ ...config, macdFast: Number(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                aria-label="MACD fast period"
              />
            </div>
            <div>
              <label htmlFor="backtest-macd-slow" className="block text-sm font-medium mb-2">
                MACD Slow
              </label>
              <input
                id="backtest-macd-slow"
                type="number"
                value={config.macdSlow || 26}
                onChange={(e) => setConfig({ ...config, macdSlow: Number(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                aria-label="MACD slow period"
              />
            </div>
            <div>
              <label htmlFor="backtest-macd-signal" className="block text-sm font-medium mb-2">
                MACD Signal
              </label>
              <input
                id="backtest-macd-signal"
                type="number"
                value={config.macdSignal || 9}
                onChange={(e) => setConfig({ ...config, macdSignal: Number(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                aria-label="MACD signal period"
              />
            </div>
          </div>
        ) : null}

        {config.strategy === 'RSI' || config.strategy === 'MACD_RSI_COMBO' ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="backtest-rsi-period" className="block text-sm font-medium mb-2">
                RSI Period
              </label>
              <input
                id="backtest-rsi-period"
                type="number"
                value={config.rsiPeriod || 14}
                onChange={(e) => setConfig({ ...config, rsiPeriod: Number(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                aria-label="RSI period"
              />
            </div>
            <div>
              <label htmlFor="backtest-rsi-overbought" className="block text-sm font-medium mb-2">
                RSI Overbought
              </label>
              <input
                id="backtest-rsi-overbought"
                type="number"
                value={config.rsiOverbought || 70}
                onChange={(e) => setConfig({ ...config, rsiOverbought: Number(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                aria-label="RSI overbought threshold"
              />
            </div>
            <div>
              <label htmlFor="backtest-rsi-oversold" className="block text-sm font-medium mb-2">
                RSI Oversold
              </label>
              <input
                id="backtest-rsi-oversold"
                type="number"
                value={config.rsiOversold || 30}
                onChange={(e) => setConfig({ ...config, rsiOversold: Number(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                aria-label="RSI oversold threshold"
              />
            </div>
          </div>
        ) : null}

        <button
          onClick={handleRunBacktest}
          disabled={loading}
          className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-medium"
        >
          {loading ? 'Running Backtest...' : 'Run Backtest'}
        </button>

        {error && (
          <div className="p-3 bg-red-900 border border-red-700 rounded text-red-200">{error}</div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-gray-800 rounded">
            <h3 className="text-xl font-bold mb-4">Backtest Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400">Total Return</div>
                <div
                  className={`text-2xl font-bold ${result.metrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {result.metrics.totalReturn.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Win Rate</div>
                <div className="text-2xl font-bold">{result.metrics.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Sharpe Ratio</div>
                <div className="text-2xl font-bold">{result.metrics.sharpeRatio.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Max Drawdown</div>
                <div className="text-2xl font-bold text-red-400">
                  {result.metrics.maxDrawdown.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Total Trades: {result.metrics.totalTrades} | Winning: {result.metrics.winningTrades} |
              Losing: {result.metrics.losingTrades}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
