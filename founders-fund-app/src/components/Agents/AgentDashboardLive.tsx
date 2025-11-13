'use client';

import React, { useState, useEffect } from 'react';
import AgentCardLive from './AgentCardLive';
import CreateAgentForm from './CreateAgentForm';

interface Agent {
  id: string;
  name: string;
  symbol: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED';
  allocation: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalValue: number;
  winRate: number;
  tradeCount: number;
  deployed: string;
  chain?: string;
  address?: string;
  holdings?: number;
}

interface AgentDashboardLiveProps {
  portfolioId: string;
}

export default function AgentDashboardLive({ portfolioId }: AgentDashboardLiveProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'CLOSED'>('ALL');

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents?portfolioId=${portfolioId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }

      const data = await response.json();
      setAgents(data.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [portfolioId]);

  const handleAgentAction = async (agentId: string, action: 'pause' | 'resume' | 'close') => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} agent`);
      }

      // Refresh agents list
      await fetchAgents();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} agent`);
    }
  };

  const handleAgentClick = (agentId: string) => {
    // Navigate to agent detail view
    window.location.href = `/agents/${agentId}`;
  };

  const filteredAgents = filterStatus === 'ALL'
    ? agents
    : agents.filter(agent => agent.status === filterStatus);

  // Calculate aggregate stats
  const totalAllocation = agents.reduce((sum, a) => sum + Number(a.allocation), 0);
  const totalValue = agents.reduce((sum, a) => sum + Number(a.totalValue), 0);
  const totalRealizedPnl = agents.reduce((sum, a) => sum + Number(a.realizedPnl), 0);
  const totalUnrealizedPnl = agents.reduce((sum, a) => sum + Number(a.unrealizedPnl), 0);
  const totalPnl = totalRealizedPnl + totalUnrealizedPnl;
  const totalReturn = totalAllocation > 0 ? (totalPnl / totalAllocation) * 100 : 0;

  const activeCount = agents.filter(a => a.status === 'ACTIVE').length;
  const pausedCount = agents.filter(a => a.status === 'PAUSED').length;
  const closedCount = agents.filter(a => a.status === 'CLOSED').length;

  if (showCreateForm) {
    return (
      <div className="p-6">
        <CreateAgentForm
          portfolioId={portfolioId}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchAgents();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Trading Agents</h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            Manage up to 20 automated meme coin trading agents
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              LIVE PRICES
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={agents.length >= 20}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          + Deploy New Agent
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Agents</p>
          <p className="text-2xl font-bold text-gray-900">{agents.length}/20</p>
          <p className="text-xs text-gray-500 mt-1">
            {activeCount} active, {pausedCount} paused, {closedCount} closed
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Allocation</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalAllocation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
            Total Value
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className={`border rounded-lg p-4 shadow-sm ${totalPnl >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
            Total P&L
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </p>
          <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs font-medium ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}% return
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['ALL', 'ACTIVE', 'PAUSED', 'CLOSED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              filterStatus === status
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {status}
            {status !== 'ALL' && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-xs">
                {status === 'ACTIVE' && activeCount}
                {status === 'PAUSED' && pausedCount}
                {status === 'CLOSED' && closedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-gray-500 mt-2">Loading agents...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && agents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No agents deployed yet</h3>
          <p className="text-gray-600 mb-4">Deploy your first AI trading agent to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Deploy First Agent
          </button>
        </div>
      )}

      {/* Agent Grid */}
      {!loading && filteredAgents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCardLive
              key={agent.id}
              agent={agent}
              onPause={(id) => handleAgentAction(id, 'pause')}
              onResume={(id) => handleAgentAction(id, 'resume')}
              onClose={(id) => handleAgentAction(id, 'close')}
              onClick={handleAgentClick}
            />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && agents.length > 0 && filteredAgents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No agents found with status: {filterStatus}</p>
        </div>
      )}
    </div>
  );
}
