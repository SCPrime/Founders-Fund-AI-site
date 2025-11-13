'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PortfolioDataPoint } from '../types';

interface PortfolioValueChartProps {
  data: PortfolioDataPoint[];
  height?: number;
  theme?: 'light' | 'dark';
}

export default function PortfolioValueChart({
  data,
  height = 400,
  theme = 'dark',
}: PortfolioValueChartProps) {
  const isDark = theme === 'dark';

  const chartData = data.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleDateString(),
    value: point.totalValue,
  }));

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Portfolio Total Value Over Time
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
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
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Portfolio Value']}
          />
          <Legend wrapperStyle={{ color: isDark ? '#ffffff' : '#000000' }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Total Value"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
