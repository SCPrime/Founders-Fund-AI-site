'use client';

import React, { useState, useEffect } from 'react';

interface AgentLeaderboardProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  portfolioId?: string;
}

interface AgentData {
  agentId: string;
  agentName: string;
  symbol: string;
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  volume: number;
  fees: number;
  avgTradeSize: number;
  profitableTrades: number;
  winRate: number;
  totalPnl: number;
}

type SortField = 'agentName' | 'totalTrades' | 'volume' | 'winRate' | 'totalPnl' | 'fees';
type SortDirection = 'asc' | 'desc';

export default function AgentLeaderboard({ dateRange, portfolioId }: AgentLeaderboardProps) {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalPnl');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAgentData();
  }, [dateRange, portfolioId]);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (portfolioId) params.append('portfolioId', portfolioId);

      const response = await fetch(`/api/reports/trading?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch agent data');
      }

      const result = await response.json();
      setAgents(result.data.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort agents
  const filteredAgents = agents.filter((agent) =>
    agent.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    const aNum = Number(aVal);
    const bNum = Number(bVal);
    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !agents) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || 'No data available'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Agent Trading Leaderboard</h3>
            <p className="text-sm text-gray-500 mt-1">
              {sortedAgents.length} agents with trading activity
            </p>
          </div>

          {/* Search */}
          <div className="w-64">
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('agentName')}
              >
                <div className="flex items-center gap-1">
                  Agent
                  {sortField === 'agentName' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Symbol
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalTrades')}
              >
                <div className="flex items-center justify-end gap-1">
                  Trades
                  {sortField === 'totalTrades' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center justify-end gap-1">
                  Volume
                  {sortField === 'volume' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('winRate')}
              >
                <div className="flex items-center justify-end gap-1">
                  Win Rate
                  {sortField === 'winRate' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalPnl')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total P&L
                  {sortField === 'totalPnl' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('fees')}
              >
                <div className="flex items-center justify-end gap-1">
                  Fees
                  {sortField === 'fees' && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAgents.map((agent, index) => (
              <tr key={agent.agentId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-100 text-gray-700'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                  <div className="text-xs text-gray-500">
                    {agent.buyTrades} buys, {agent.sellTrades} sells
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="px-2 py-1 bg-gray-100 rounded font-mono text-xs">
                    {agent.symbol}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {agent.totalTrades}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  ${(agent.volume / 1000).toFixed(1)}K
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      agent.winRate >= 60
                        ? 'bg-green-100 text-green-800'
                        : agent.winRate >= 40
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {agent.winRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div
                    className={`font-semibold ${
                      agent.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {agent.totalPnl >= 0 ? '+' : ''}${agent.totalPnl.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                  ${agent.fees.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {sortedAgents.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          {searchTerm ? 'No agents match your search' : 'No trading data available'}
        </div>
      )}

      {/* Summary Footer */}
      {sortedAgents.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Trades:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {sortedAgents.reduce((sum, a) => sum + a.totalTrades, 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Total Volume:</span>
              <span className="ml-2 font-semibold text-gray-900">
                ${(sortedAgents.reduce((sum, a) => sum + a.volume, 0) / 1000).toFixed(1)}K
              </span>
            </div>
            <div>
              <span className="text-gray-500">Avg Win Rate:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {(
                  sortedAgents.reduce((sum, a) => sum + a.winRate, 0) / sortedAgents.length
                ).toFixed(1)}
                %
              </span>
            </div>
            <div>
              <span className="text-gray-500">Total P&L:</span>
              <span
                className={`ml-2 font-semibold ${
                  sortedAgents.reduce((sum, a) => sum + a.totalPnl, 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                ${sortedAgents.reduce((sum, a) => sum + a.totalPnl, 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Total Fees:</span>
              <span className="ml-2 font-semibold text-gray-900">
                ${sortedAgents.reduce((sum, a) => sum + a.fees, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
