'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TradingHeatmapProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  portfolioId?: string;
}

interface TradingData {
  portfolio: {
    totalTrades: number;
    buyTrades: number;
    sellTrades: number;
    totalVolume: number;
    totalFees: number;
    avgTradeSize: number;
    avgFeePerTrade: number;
    profitableTrades: number;
    losingTrades: number;
    winRate: number;
  };
  tokens: {
    mostProfitable: Array<{
      symbol: string;
      totalPnl: number;
      winRate: number;
    }>;
    leastProfitable: Array<{
      symbol: string;
      totalPnl: number;
      winRate: number;
    }>;
  };
  tradeFrequency: Array<{
    date: string;
    hour: number;
    count: number;
  }>;
  volumeTimeSeries: Array<{
    date: string;
    volume: number;
  }>;
  slippage: {
    average: number;
    total: number;
  };
}

// const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']; // Reserved for future use

export default function TradingHeatmap({ dateRange, portfolioId }: TradingHeatmapProps) {
  const [data, setData] = useState<TradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTradingData();
  }, [dateRange, portfolioId]);

  const fetchTradingData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (portfolioId) params.append('portfolioId', portfolioId);

      const response = await fetch(`/api/reports/trading?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch trading data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trading data');
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

  const { portfolio, tokens, tradeFrequency, volumeTimeSeries, slippage } = data;

  // Aggregate frequency by hour (across all dates)
  const hourlyFrequency = new Array(24).fill(0);
  tradeFrequency.forEach(({ hour, count }) => {
    hourlyFrequency[hour] += count;
  });

  const hourlyData = hourlyFrequency.map((count, hour) => ({
    hour: `${hour}:00`,
    trades: count,
  }));

  // Prepare data for daily heatmap (last 7 days, 24 hours)
  const heatmapData: number[][] = [];
  const dates: string[] = [];

  // Get unique dates
  const uniqueDates = [...new Set(tradeFrequency.map((f) => f.date))].sort().slice(-7);

  uniqueDates.forEach((date) => {
    const dayData = new Array(24).fill(0);
    tradeFrequency
      .filter((f) => f.date === date)
      .forEach((f) => {
        dayData[f.hour] = f.count;
      });
    heatmapData.push(dayData);
    dates.push(new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  });

  return (
    <div className="space-y-6">
      {/* Trading Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <TradingMetricCard
          title="Total Trades"
          value={portfolio.totalTrades.toLocaleString()}
          subtitle={`${portfolio.buyTrades} buys, ${portfolio.sellTrades} sells`}
        />
        <TradingMetricCard
          title="Total Volume"
          value={`$${(portfolio.totalVolume / 1000).toFixed(1)}K`}
          subtitle={`Avg: $${portfolio.avgTradeSize.toFixed(0)}`}
        />
        <TradingMetricCard
          title="Total Fees"
          value={`$${portfolio.totalFees.toFixed(2)}`}
          subtitle={`Avg: $${portfolio.avgFeePerTrade.toFixed(2)}`}
        />
        <TradingMetricCard
          title="Win Rate"
          value={`${portfolio.winRate.toFixed(1)}%`}
          subtitle={`${portfolio.profitableTrades} wins, ${portfolio.losingTrades} losses`}
        />
        <TradingMetricCard
          title="Avg Slippage"
          value={`${slippage.average.toFixed(3)}%`}
          subtitle={`Total: $${slippage.total.toFixed(2)}`}
        />
      </div>

      {/* Trade Frequency Heatmap */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Trade Frequency Heatmap (Last 7 Days)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-2 text-xs font-medium text-gray-500 text-left">Date</th>
                {Array.from({ length: 24 }, (_, i) => (
                  <th key={i} className="px-1 py-2 text-xs font-medium text-gray-500 text-center">
                    {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((dayData, dayIndex) => (
                <tr key={dayIndex}>
                  <td className="px-2 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {dates[dayIndex]}
                  </td>
                  {dayData.map((count, hourIndex) => (
                    <td
                      key={hourIndex}
                      className="px-1 py-2 text-center text-xs"
                      style={{
                        backgroundColor: getHeatmapColor(count),
                        color: count > 5 ? 'white' : 'black',
                      }}
                      title={`${count} trades at ${hourIndex}:00 on ${dates[dayIndex]}`}
                    >
                      {count > 0 ? count : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-600">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 2, 5, 10, 15].map((val) => (
              <div
                key={val}
                className="w-6 h-4"
                style={{ backgroundColor: getHeatmapColor(val) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Hourly Trading Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Activity by Hour (UTC)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="hour" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="trades" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Time Series */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Trading Volume</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={volumeTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tickFormatter={(date) =>
                new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
            />
            <YAxis stroke="#6b7280" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
              formatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Bar dataKey="volume" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Most and Least Profitable Tokens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Profitable Tokens</h3>
          <div className="space-y-3">
            {tokens.mostProfitable.map((token, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{token.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-green-600 font-semibold">
                    +${token.totalPnl.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">{token.winRate.toFixed(1)}% win rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Least Profitable Tokens</h3>
          <div className="space-y-3">
            {tokens.leastProfitable.map((token, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{token.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-red-600 font-semibold">
                    ${token.totalPnl.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">{token.winRate.toFixed(1)}% win rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getHeatmapColor(count: number): string {
  if (count === 0) return '#f3f4f6';
  if (count < 3) return '#dbeafe';
  if (count < 6) return '#93c5fd';
  if (count < 10) return '#60a5fa';
  if (count < 15) return '#3b82f6';
  return '#1e40af';
}

interface TradingMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
}

function TradingMetricCard({ title, value, subtitle }: TradingMetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
