'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RiskMatrixProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  portfolioId?: string;
}

interface RiskData {
  portfolio: {
    portfolioVolatility: number;
    var95: number;
    var99: number;
    cvar95: number;
    cvar99: number;
    concentrationRisk: number;
    liquidityScore: number;
    topHoldings: Array<{
      agentName: string;
      symbol: string;
      percent: number;
    }>;
  };
  agents: Array<{
    agentId: string;
    agentName: string;
    symbol: string;
    allocation: number;
    allocationPercent: number;
    volatility: number;
    var95: number;
    cvar95: number;
    maxDrawdown: number;
  }>;
  correlationMatrix: Record<string, Record<string, number>>;
  volatilityTimeSeries: Array<{
    day: number;
    volatility: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function RiskMatrix({ dateRange, portfolioId }: RiskMatrixProps) {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRiskData();
  }, [dateRange, portfolioId]);

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (portfolioId) params.append('portfolioId', portfolioId);

      const response = await fetch(`/api/reports/risk?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch risk data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load risk data');
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

  const { portfolio, agents, correlationMatrix, volatilityTimeSeries } = data;

  // Prepare concentration data for pie chart
  const concentrationData = portfolio.topHoldings.map((holding) => ({
    name: holding.symbol,
    value: holding.percent,
  }));

  // Add "Others" if needed
  const topPercent = portfolio.topHoldings.reduce((sum, h) => sum + h.percent, 0);
  if (topPercent < 100) {
    concentrationData.push({
      name: 'Others',
      value: 100 - topPercent,
    });
  }

  // Get correlation matrix agents
  const agentNames = Object.keys(correlationMatrix);

  return (
    <div className="space-y-6">
      {/* Key Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskMetricCard
          title="Portfolio Volatility"
          value={`${portfolio.portfolioVolatility.toFixed(2)}%`}
          subtitle="30-day annualized"
          riskLevel={portfolio.portfolioVolatility > 50 ? 'high' : portfolio.portfolioVolatility > 30 ? 'medium' : 'low'}
        />
        <RiskMetricCard
          title="Value at Risk (95%)"
          value={`${portfolio.var95.toFixed(2)}%`}
          subtitle={`CVaR: ${portfolio.cvar95.toFixed(2)}%`}
          riskLevel={Math.abs(portfolio.var95) > 10 ? 'high' : Math.abs(portfolio.var95) > 5 ? 'medium' : 'low'}
        />
        <RiskMetricCard
          title="Concentration Risk"
          value={`${portfolio.concentrationRisk.toFixed(1)}%`}
          subtitle="HHI Score"
          riskLevel={portfolio.concentrationRisk > 25 ? 'high' : portfolio.concentrationRisk > 15 ? 'medium' : 'low'}
        />
        <RiskMetricCard
          title="Liquidity Score"
          value={`${portfolio.liquidityScore.toFixed(1)} days`}
          subtitle="Est. liquidation time"
          riskLevel={portfolio.liquidityScore > 10 ? 'high' : portfolio.liquidityScore > 5 ? 'medium' : 'low'}
        />
      </div>

      {/* VaR Comparison */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Value at Risk Comparison</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm text-gray-600 mb-1">VaR 95%</div>
            <div className="text-2xl font-bold text-orange-600">{portfolio.var95.toFixed(2)}%</div>
            <div className="text-xs text-gray-500 mt-1">1 in 20 days</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-sm text-gray-600 mb-1">VaR 99%</div>
            <div className="text-2xl font-bold text-red-600">{portfolio.var99.toFixed(2)}%</div>
            <div className="text-xs text-gray-500 mt-1">1 in 100 days</div>
          </div>
        </div>
      </div>

      {/* Volatility Time Series */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rolling Volatility (30-day)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={volatilityTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" stroke="#6b7280" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
            <YAxis stroke="#6b7280" label={{ value: 'Volatility %', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Line type="monotone" dataKey="volatility" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Concentration Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Concentration</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={concentrationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {concentrationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Holdings List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Holdings</h3>
          <div className="space-y-3">
            {portfolio.topHoldings.map((holding, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{holding.agentName}</div>
                    <div className="text-sm text-gray-500">{holding.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{holding.percent.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Risk Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agent Risk Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocation %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volatility
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VaR 95%
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Drawdown
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.agentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {agent.agentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {agent.allocationPercent.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {agent.volatility.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                    {agent.var95.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                    {agent.maxDrawdown.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correlation Matrix Heatmap */}
      {agentNames.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Correlation Matrix</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-xs font-medium text-gray-500"></th>
                  {agentNames.slice(0, 8).map((name) => (
                    <th key={name} className="px-2 py-2 text-xs font-medium text-gray-500 text-center">
                      {name.substring(0, 8)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentNames.slice(0, 8).map((name1) => (
                  <tr key={name1}>
                    <td className="px-2 py-2 text-xs font-medium text-gray-700">
                      {name1.substring(0, 8)}
                    </td>
                    {agentNames.slice(0, 8).map((name2) => {
                      const corr = correlationMatrix[name1]?.[name2] || 0;
                      const bgColor = getCorrelationColor(corr);
                      return (
                        <td
                          key={name2}
                          className="px-2 py-2 text-center text-xs font-medium"
                          style={{ backgroundColor: bgColor, color: Math.abs(corr) > 0.5 ? 'white' : 'black' }}
                        >
                          {corr.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Correlation ranges from -1 (inverse) to +1 (perfect correlation). Values near 0 indicate low correlation.
          </p>
        </div>
      )}
    </div>
  );
}

function getCorrelationColor(corr: number): string {
  if (corr > 0.7) return '#ef4444'; // Strong positive - red
  if (corr > 0.3) return '#f97316'; // Moderate positive - orange
  if (corr > -0.3) return '#e5e7eb'; // Weak - gray
  if (corr > -0.7) return '#60a5fa'; // Moderate negative - light blue
  return '#3b82f6'; // Strong negative - blue
}

interface RiskMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  riskLevel: 'low' | 'medium' | 'high';
}

function RiskMetricCard({ title, value, subtitle, riskLevel }: RiskMetricCardProps) {
  const colors = {
    low: 'border-green-200 bg-green-50',
    medium: 'border-yellow-200 bg-yellow-50',
    high: 'border-red-200 bg-red-50',
  };

  const textColors = {
    low: 'text-green-700',
    medium: 'text-yellow-700',
    high: 'text-red-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[riskLevel]}`}>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${textColors[riskLevel]}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
      <div className="mt-2">
        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
            riskLevel === 'low'
              ? 'bg-green-200 text-green-800'
              : riskLevel === 'medium'
              ? 'bg-yellow-200 text-yellow-800'
              : 'bg-red-200 text-red-800'
          }`}
        >
          {riskLevel.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
