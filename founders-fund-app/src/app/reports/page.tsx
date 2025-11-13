'use client';

import React, { useState, useEffect } from 'react';
import PerformanceOverview from '@/components/Reports/PerformanceOverview';
import RiskMatrix from '@/components/Reports/RiskMatrix';
import TradingHeatmap from '@/components/Reports/TradingHeatmap';
import AgentLeaderboard from '@/components/Reports/AgentLeaderboard';
import CustomReportBuilder from '@/components/Reports/CustomReportBuilder';

type TabType = 'overview' | 'performance' | 'risk' | 'trading' | 'custom';
type DateRangeType = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<DateRangeType>('30d');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [portfolioId, setPortfolioId] = useState<string>('');
  const [benchmark, setBenchmark] = useState<'BTC' | 'ETH' | 'SOL' | null>(null);

  // Calculate actual date range based on selection
  const getDateRangeParams = (): DateRange => {
    if (dateRange === 'custom') {
      return customDateRange;
    }

    const endDate = new Date().toISOString().split('T')[0];
    let startDate: Date;

    switch (dateRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate,
    };
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '📊' },
    { id: 'performance' as TabType, label: 'Performance', icon: '📈' },
    { id: 'risk' as TabType, label: 'Risk', icon: '⚠️' },
    { id: 'trading' as TabType, label: 'Trading', icon: '💱' },
    { id: 'custom' as TabType, label: 'Custom', icon: '🔧' },
  ];

  const dateRangeOptions: { value: DateRangeType; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
    { value: 'all', label: 'All Time' },
    { value: 'custom', label: 'Custom' },
  ];

  const benchmarkOptions = [
    { value: null, label: 'No Benchmark' },
    { value: 'BTC' as const, label: 'Bitcoin (BTC)' },
    { value: 'ETH' as const, label: 'Ethereum (ETH)' },
    { value: 'SOL' as const, label: 'Solana (SOL)' },
  ];

  const exportReport = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        ...getDateRangeParams(),
        format,
      });

      if (portfolioId) {
        params.append('portfolioId', portfolioId);
      }

      const response = await fetch(`/api/reports/export-pdf?${params}`);

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${activeTab}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive portfolio and trading insights</p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => exportReport('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Export PDF
              </button>
              <button
                onClick={() => exportReport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportReport('json')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-4">
            {/* Date Range Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) =>
                      setCustomDateRange({ ...customDateRange, startDate: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) =>
                      setCustomDateRange({ ...customDateRange, endDate: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Benchmark Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benchmark
              </label>
              <select
                value={benchmark || ''}
                onChange={(e) => setBenchmark(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {benchmarkOptions.map((option) => (
                  <option key={option.label} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <PerformanceOverview
            dateRange={getDateRangeParams()}
            portfolioId={portfolioId}
            benchmark={benchmark}
          />
        )}
        {activeTab === 'performance' && (
          <PerformanceOverview
            dateRange={getDateRangeParams()}
            portfolioId={portfolioId}
            benchmark={benchmark}
          />
        )}
        {activeTab === 'risk' && (
          <RiskMatrix dateRange={getDateRangeParams()} portfolioId={portfolioId} />
        )}
        {activeTab === 'trading' && (
          <div className="space-y-6">
            <TradingHeatmap dateRange={getDateRangeParams()} portfolioId={portfolioId} />
            <AgentLeaderboard dateRange={getDateRangeParams()} portfolioId={portfolioId} />
          </div>
        )}
        {activeTab === 'custom' && <CustomReportBuilder />}
      </div>
    </div>
  );
}
