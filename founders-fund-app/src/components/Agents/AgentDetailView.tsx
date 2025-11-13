'use client';

import React, { useState, useEffect } from 'react';
import AgentSettingsPanel from './AgentSettingsPanel';

interface Trade {
  id: string;
  side: 'BUY' | 'SELL';
  amount: number;
  price: number;
  value?: number;
  fees: number;
  pnl: number | null;
  timestamp: string;
}

interface PerformanceSnapshot {
  id: string;
  timestamp: string;
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  winRate: number;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
}

interface AgentDetail {
  id: string;
  name: string;
  symbol: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  allocation: number;
  strategy: Record<string, unknown>;
  deployed: string;
  totalValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
}

interface AgentDetailViewProps {
  agentId: string;
}

export default function AgentDetailView({ agentId }: AgentDetailViewProps) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<7 | 30 | 90>(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'performance'>('overview');

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/${agentId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch agent details');
      }

      const data = await response.json();
      setAgent(data.agent);
      setTrades(data.trades);
      setPerformanceHistory(data.performanceHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentDetails();
  }, [agentId]);

  const handleAction = async (action: 'pause' | 'resume' | 'close') => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} agent`);
      }

      await fetchAgentDetails();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} agent`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Agent not found'}
        </div>
      </div>
    );
  }

  const isProfitable = agent.totalPnl >= 0;
  const returnPercent = agent.allocation > 0 ? (agent.totalPnl / Number(agent.allocation)) * 100 : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => window.history.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
            <span className="text-xl font-mono text-gray-500">{agent.symbol}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              agent.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              agent.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {agent.status}
            </span>
            <span className="text-sm text-gray-500">
              Deployed {new Date(agent.deployed).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Settings
          </button>
          {agent.status === 'ACTIVE' && (
            <button
              onClick={() => handleAction('pause')}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
            >
              Pause
            </button>
          )}
          {agent.status === 'PAUSED' && (
            <button
              onClick={() => handleAction('resume')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Resume
            </button>
          )}
          {agent.status !== 'CLOSED' && (
            <button
              onClick={() => {
                if (confirm(`Close ${agent.name}? This will stop all trading.`)) {
                  handleAction('close');
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Export Options */}
      {showExportOptions && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Export Performance Report</h3>
              <p className="text-sm text-gray-500 mt-1">Generate a PDF report with performance metrics, charts, and trade history</p>
            </div>
            <button
              onClick={() => setShowExportOptions(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <div className="flex gap-2">
                {([7, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => setExportDateRange(days)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      exportDateRange === days
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Last {days} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/reports/agent-performance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        agentId,
                        dateRange: exportDateRange,
                        options: { saveToDatabase: true, includeCharts: true }
                      })
                    });

                    if (!response.ok) throw new Error('Export failed');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `agent-performance-${agent.symbol}-${new Date().toISOString().split('T')[0]}.pdf`;
                    link.click();
                    window.URL.revokeObjectURL(url);

                    setShowExportOptions(false);
                  } catch (err) {
                    alert('Failed to export report: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export as PDF
              </button>

              <button
                onClick={async () => {
                  // Export CSV
                  const csvData = trades.map(t => ({
                    Date: new Date(t.timestamp).toLocaleString(),
                    Side: t.side,
                    Amount: Number(t.amount).toFixed(4),
                    Price: `$${Number(t.price).toFixed(6)}`,
                    Fees: `$${Number(t.fees).toFixed(2)}`,
                    PnL: t.pnl ? `$${Number(t.pnl).toFixed(2)}` : '-'
                  }));

                  const csvContent = [
                    Object.keys(csvData[0] || {}).join(','),
                    ...csvData.map(row => Object.values(row).join(','))
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `agent-trades-${agent.symbol}-${new Date().toISOString().split('T')[0]}.csv`;
                  link.click();
                  window.URL.revokeObjectURL(url);

                  setShowExportOptions(false);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6">
          <AgentSettingsPanel
            agentId={agentId}
            currentStrategy={agent.strategy}
            onClose={() => setShowSettings(false)}
            onUpdate={fetchAgentDetails}
          />
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Allocation</p>
          <p className="text-2xl font-bold text-gray-900">
            ${Number(agent.allocation).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Current Value</p>
          <p className="text-2xl font-bold text-gray-900">
            ${Number(agent.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`border rounded-lg p-4 shadow-sm ${isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-sm text-gray-500 mb-1">Total P&L</p>
          <p className={`text-2xl font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
            {isProfitable ? '+' : ''}${agent.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-xs font-medium ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(2)}%
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-gray-900">{agent.winRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">{agent.winningTrades}W / {agent.losingTrades}L</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['overview', 'trades', 'performance'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Realized P&L</p>
              <p className={`text-xl font-bold ${Number(agent.realizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Number(agent.realizedPnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Unrealized P&L</p>
              <p className={`text-xl font-bold ${Number(agent.unrealizedPnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Number(agent.unrealizedPnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Total Trades</p>
              <p className="text-xl font-bold text-gray-900">{agent.totalTrades}</p>
            </div>
          </div>

          {agent.strategy && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Trading Strategy</h3>
              <pre className="text-xs text-gray-600 overflow-auto bg-gray-50 p-3 rounded">
                {JSON.stringify(agent.strategy, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Side</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fees</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(trade.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.side === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono">
                    {Number(trade.amount).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono">
                    ${Number(trade.price).toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500 font-mono">
                    ${Number(trade.fees).toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-mono ${
                    trade.pnl === null ? 'text-gray-400' :
                    Number(trade.pnl) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trade.pnl === null ? '-' : `$${Number(trade.pnl).toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trades.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No trades yet
            </div>
          )}
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Performance History</h3>
          <div className="space-y-2">
            {performanceHistory.map((perf) => (
              <div key={perf.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">
                  {new Date(perf.timestamp).toLocaleString()}
                </span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    ${Number(perf.totalValue).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Win Rate: {Number(perf.winRate).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
          {performanceHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No performance history yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
