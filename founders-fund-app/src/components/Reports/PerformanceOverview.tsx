'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceOverviewProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  portfolioId?: string;
  benchmark?: 'BTC' | 'ETH' | 'SOL' | null;
}

interface PerformanceData {
  portfolio: {
    totalAllocation: number;
    totalValue: number;
    totalPnl: number;
    portfolioReturn: number;
    realizedPnl: number;
    unrealizedPnl: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    currentDrawdown: number;
    volatility: number;
    winRate: number;
    profitFactor: number;
    alpha?: number;
    beta?: number;
  };
  timeSeries: Array<{
    timestamp: string;
    portfolioValue: number;
    realizedPnl: number;
    unrealizedPnl: number;
  }>;
  topPerformers: Array<{
    agentName: string;
    returnPercent: number;
    totalPnl: number;
  }>;
  bottomPerformers: Array<{
    agentName: string;
    returnPercent: number;
    totalPnl: number;
  }>;
}

export default function PerformanceOverview({
  dateRange,
  portfolioId,
  benchmark,
}: PerformanceOverviewProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange, portfolioId, benchmark]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (portfolioId) params.append('portfolioId', portfolioId);
      if (benchmark) params.append('benchmark', benchmark);

      const response = await fetch(`/api/reports/performance?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || 'No data available'}
      </div>
    );
  }

  const { portfolio, timeSeries, topPerformers, bottomPerformers } = data;

  // Format time series for chart
  const chartData = timeSeries.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: point.portfolioValue,
    realized: point.realizedPnl,
    unrealized: point.unrealizedPnl,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Value"
          value={`$${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`Allocation: $${portfolio.totalAllocation.toLocaleString()}`}
          trend={portfolio.portfolioReturn}
          positive={portfolio.portfolioReturn >= 0}
        />
        <MetricCard
          title="Total Return"
          value={`${portfolio.portfolioReturn >= 0 ? '+' : ''}${portfolio.portfolioReturn.toFixed(2)}%`}
          subtitle={`P&L: ${portfolio.totalPnl >= 0 ? '+' : ''}$${portfolio.totalPnl.toLocaleString()}`}
          positive={portfolio.portfolioReturn >= 0}
        />
        <MetricCard
          title="Sharpe Ratio"
          value={portfolio.sharpeRatio.toFixed(2)}
          subtitle="Risk-adjusted return"
          positive={portfolio.sharpeRatio > 1}
        />
        <MetricCard
          title="Max Drawdown"
          value={`${portfolio.maxDrawdown.toFixed(2)}%`}
          subtitle={`Current: ${portfolio.currentDrawdown.toFixed(2)}%`}
          positive={portfolio.maxDrawdown > -10}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Sortino Ratio"
          value={portfolio.sortinoRatio.toFixed(2)}
          subtitle="Downside risk"
          compact
        />
        <MetricCard
          title="Calmar Ratio"
          value={portfolio.calmarRatio.toFixed(2)}
          subtitle="Return/Drawdown"
          compact
        />
        <MetricCard
          title="Volatility"
          value={`${portfolio.volatility.toFixed(2)}%`}
          subtitle="Annualized"
          compact
        />
        <MetricCard
          title="Win Rate"
          value={`${portfolio.winRate.toFixed(1)}%`}
          subtitle="Profitable trades"
          compact
        />
        <MetricCard
          title="Profit Factor"
          value={portfolio.profitFactor.toFixed(2)}
          subtitle="Gross profit/loss"
          compact
        />
        {portfolio.alpha !== undefined && (
          <MetricCard
            title="Alpha"
            value={`${(portfolio.alpha * 100).toFixed(2)}%`}
            subtitle={`Beta: ${portfolio.beta?.toFixed(2)}`}
            compact
            positive={portfolio.alpha > 0}
          />
        )}
      </div>

      {/* Portfolio Value Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Value Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* P&L Breakdown Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">P&L Breakdown</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="realized"
              stroke="#10b981"
              strokeWidth={2}
              name="Realized P&L"
            />
            <Line
              type="monotone"
              dataKey="unrealized"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Unrealized P&L"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {topPerformers.map((agent, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{agent.agentName}</span>
                </div>
                <div className="text-right">
                  <div className="text-green-600 font-semibold">
                    +{agent.returnPercent.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    +${agent.totalPnl.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bottom Performers</h3>
          <div className="space-y-3">
            {bottomPerformers.map((agent, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{agent.agentName}</span>
                </div>
                <div className="text-right">
                  <div className="text-red-600 font-semibold">
                    {agent.returnPercent.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    ${agent.totalPnl.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  positive?: boolean;
  compact?: boolean;
}

function MetricCard({ title, value, subtitle, trend, positive, compact }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${compact ? '' : 'shadow-sm'}`}>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className={`font-bold ${compact ? 'text-xl' : 'text-2xl'} ${
        positive !== undefined
          ? positive
            ? 'text-green-600'
            : 'text-red-600'
          : 'text-gray-900'
      }`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
      {trend !== undefined && (
        <div className={`text-xs font-medium mt-1 ${positive ? 'text-green-600' : 'text-red-600'}`}>
          {positive ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
