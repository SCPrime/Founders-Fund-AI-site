'use client';

import { useState, useEffect } from 'react';
import { FinancialMetrics } from '../types';
import { calculateFinancialMetrics } from '../utils/indicatorCalculations';

interface MetricsPanelProps {
  returns: number[];
  theme?: 'light' | 'dark';
  riskFreeRate?: number;
  onRefresh?: () => void;
}

interface MetricCardProps {
  label: string;
  value: number | string;
  format: 'currency' | 'percentage' | 'number' | 'ratio';
  description: string;
  theme: 'light' | 'dark';
  positive?: boolean;
}

function MetricCard({ label, value, format, description, theme, positive }: MetricCardProps) {
  const isDark = theme === 'dark';

  const formatValue = () => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      case 'ratio':
        return value.toFixed(4);
      default:
        return value.toString();
    }
  };

  const getColorClass = () => {
    if (positive === undefined) return isDark ? 'text-white' : 'text-gray-900';
    return positive
      ? 'text-green-500'
      : 'text-red-500';
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
      } hover:shadow-lg transition-shadow`}
      title={description}
    >
      <div className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {label}
      </div>
      <div className={`text-2xl font-bold ${getColorClass()}`}>
        {formatValue()}
      </div>
      <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        {description}
      </div>
    </div>
  );
}

export default function MetricsPanel({
  returns,
  theme = 'dark',
  riskFreeRate = 0.02,
  onRefresh,
}: MetricsPanelProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (returns.length === 0) return;

    setLoading(true);
    try {
      const calculated = calculateFinancialMetrics(returns, riskFreeRate);
      const totalTrades = returns.length;
      // const wins = returns.filter(r => r > 0).length; // Reserved for future use
      // const losses = returns.filter(r => r < 0).length; // Reserved for future use

      setMetrics({
        ...calculated,
        totalTrades,
        alpha: 0, // Would need benchmark data
        beta: 1, // Would need benchmark data
      });
    } catch (error) {
      console.error('Failed to calculate metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [returns, riskFreeRate]);

  const isDark = theme === 'dark';

  if (loading || !metrics) {
    return (
      <div className={`p-8 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="text-center">
          <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            {loading ? 'Calculating metrics...' : 'No data available'}
          </div>
        </div>
      </div>
    );
  }

  const metricDefinitions: Array<Omit<MetricCardProps, 'theme'>> = [
    {
      label: 'Sharpe Ratio',
      value: metrics.sharpeRatio,
      format: 'ratio',
      description: 'Risk-adjusted return (>1 is good, >2 is excellent)',
      positive: metrics.sharpeRatio > 1,
    },
    {
      label: 'Sortino Ratio',
      value: metrics.sortinoRatio,
      format: 'ratio',
      description: 'Downside risk-adjusted return (higher is better)',
      positive: metrics.sortinoRatio > 1,
    },
    {
      label: 'Max Drawdown',
      value: metrics.maxDrawdown,
      format: 'percentage',
      description: 'Largest peak-to-trough decline',
      positive: metrics.maxDrawdown < 20,
    },
    {
      label: 'Calmar Ratio',
      value: metrics.calmarRatio,
      format: 'ratio',
      description: 'Annual return / Max drawdown (>3 is good)',
      positive: metrics.calmarRatio > 3,
    },
    {
      label: 'Win Rate',
      value: metrics.winRate,
      format: 'percentage',
      description: 'Percentage of profitable trades',
      positive: metrics.winRate > 50,
    },
    {
      label: 'Profit Factor',
      value: metrics.profitFactor,
      format: 'ratio',
      description: 'Gross profit / Gross loss (>1.5 is good)',
      positive: metrics.profitFactor > 1.5,
    },
    {
      label: 'Volatility',
      value: metrics.volatility,
      format: 'percentage',
      description: 'Standard deviation of returns',
      positive: metrics.volatility < 30,
    },
    {
      label: 'Total Return',
      value: metrics.totalReturn,
      format: 'percentage',
      description: 'Cumulative return over period',
      positive: metrics.totalReturn > 0,
    },
    {
      label: 'Alpha',
      value: metrics.alpha,
      format: 'ratio',
      description: 'Excess return vs benchmark',
      positive: metrics.alpha > 0,
    },
    {
      label: 'Beta',
      value: metrics.beta,
      format: 'ratio',
      description: 'Correlation with market (1.0 = market)',
    },
    {
      label: 'Avg Win',
      value: metrics.avgWin,
      format: 'currency',
      description: 'Average profit per winning trade',
      positive: true,
    },
    {
      label: 'Avg Loss',
      value: metrics.avgLoss,
      format: 'currency',
      description: 'Average loss per losing trade',
      positive: false,
    },
    {
      label: 'Total Trades',
      value: metrics.totalTrades,
      format: 'number',
      description: 'Total number of trades analyzed',
    },
  ];

  return (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Financial Metrics Dashboard
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metricDefinitions.map((metric) => (
          <MetricCard key={metric.label} {...metric} theme={theme} />
        ))}
      </div>

      <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Performance Summary
        </h4>
        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
          <p>
            Risk-Free Rate: <span className="font-medium">{(riskFreeRate * 100).toFixed(2)}%</span>
          </p>
          <p>
            Sample Size: <span className="font-medium">{returns.length} returns</span>
          </p>
          <p>
            Risk Assessment:{' '}
            <span className={`font-medium ${
              metrics.sharpeRatio > 2 ? 'text-green-500' :
              metrics.sharpeRatio > 1 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {metrics.sharpeRatio > 2 ? 'Excellent' :
               metrics.sharpeRatio > 1 ? 'Good' :
               metrics.sharpeRatio > 0 ? 'Fair' : 'Poor'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
