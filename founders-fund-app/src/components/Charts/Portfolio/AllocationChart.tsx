'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PortfolioDataPoint } from '../types';

interface AllocationChartProps {
  data: PortfolioDataPoint[];
  height?: number;
  theme?: 'light' | 'dark';
}

const AGENT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
];

export default function AllocationChart({
  data,
  height = 400,
  theme = 'dark',
}: AllocationChartProps) {
  const isDark = theme === 'dark';

  // Transform data for stacked area chart
  const chartData = data.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleDateString(),
    ...point.agentValues,
  }));

  // Get agent names from first data point
  const agentNames = data.length > 0 && data[0].agentValues
    ? Object.keys(data[0].agentValues)
    : [];

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Portfolio Allocation Breakdown by Agent
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis
            dataKey="timestamp"
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
          />
          <YAxis
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
          {agentNames.map((agentName, index) => (
            <Area
              key={agentName}
              type="monotone"
              dataKey={agentName}
              stackId="1"
              stroke={AGENT_COLORS[index % AGENT_COLORS.length]}
              fill={AGENT_COLORS[index % AGENT_COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
