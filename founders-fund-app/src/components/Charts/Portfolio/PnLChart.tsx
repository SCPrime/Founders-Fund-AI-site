'use client';

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PortfolioDataPoint } from '../types';

interface PnLChartProps {
  data: PortfolioDataPoint[];
  height?: number;
  theme?: 'light' | 'dark';
}

export default function PnLChart({
  data,
  height = 400,
  theme = 'dark',
}: PnLChartProps) {
  const isDark = theme === 'dark';

  const chartData = data.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleDateString(),
    realized: point.realizedPnl,
    unrealized: point.unrealizedPnl,
    total: point.realizedPnl + point.unrealizedPnl,
  }));

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Profit & Loss: Realized vs Unrealized
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis
            dataKey="timestamp"
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
          />
          <YAxis
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              borderRadius: '0.375rem',
              color: isDark ? '#ffffff' : '#000000',
            }}
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Legend wrapperStyle={{ color: isDark ? '#ffffff' : '#000000' }} />
          <Bar
            dataKey="realized"
            fill="#10b981"
            name="Realized PnL"
            opacity={0.8}
          />
          <Bar
            dataKey="unrealized"
            fill="#f59e0b"
            name="Unrealized PnL"
            opacity={0.8}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="Total PnL"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
