'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AgentPerformanceData } from '../types';

interface AgentComparisonChartProps {
  agents: AgentPerformanceData[];
  height?: number;
  theme?: 'light' | 'dark';
  metric?: 'value' | 'pnl';
}

const AGENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#d946ef', '#f43f5e', '#a855f7', '#22c55e',
];

export default function AgentComparisonChart({
  agents,
  height = 500,
  theme = 'dark',
  metric = 'value',
}: AgentComparisonChartProps) {
  const isDark = theme === 'dark';

  // Transform data for multi-line chart
  const timestamps = new Set<string>();
  agents.forEach(agent => {
    agent.data.forEach(point => timestamps.add(point.timestamp));
  });

  const chartData = Array.from(timestamps).sort().map(timestamp => {
    const point: Record<string, string | number> = { timestamp: new Date(timestamp).toLocaleDateString() };
    agents.forEach(agent => {
      const dataPoint = agent.data.find(d => d.timestamp === timestamp);
      if (dataPoint) {
        point[agent.agentName] = metric === 'value' ? dataPoint.value : dataPoint.pnl;
      }
    });
    return point;
  });

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Agent Performance Comparison ({metric === 'value' ? 'Value' : 'PnL'})
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
            formatter={(value: number) => `$${value.toLocaleString()}`}
          />
          <Legend wrapperStyle={{ color: isDark ? '#ffffff' : '#000000' }} />
          {agents.map((agent, index) => (
            <Line
              key={agent.agentId}
              type="monotone"
              dataKey={agent.agentName}
              stroke={AGENT_COLORS[index % AGENT_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
