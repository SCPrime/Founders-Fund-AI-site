'use client';

import React, { useState } from 'react';

interface Metric {
  id: string;
  name: string;
  category: 'performance' | 'risk' | 'trading';
  description: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  metrics: string[];
  visualizations: string[];
  createdAt: string;
}

const AVAILABLE_METRICS: Metric[] = [
  // Performance Metrics
  { id: 'totalReturn', name: 'Total Return %', category: 'performance', description: 'Overall portfolio return percentage' },
  { id: 'sharpeRatio', name: 'Sharpe Ratio', category: 'performance', description: 'Risk-adjusted return measure' },
  { id: 'sortinoRatio', name: 'Sortino Ratio', category: 'performance', description: 'Downside risk-adjusted return' },
  { id: 'calmarRatio', name: 'Calmar Ratio', category: 'performance', description: 'Return vs max drawdown' },
  { id: 'alpha', name: 'Alpha', category: 'performance', description: 'Excess return vs benchmark' },
  { id: 'beta', name: 'Beta', category: 'performance', description: 'Correlation to benchmark' },
  { id: 'maxDrawdown', name: 'Max Drawdown', category: 'performance', description: 'Maximum peak-to-trough decline' },
  { id: 'winRate', name: 'Win Rate', category: 'performance', description: 'Percentage of profitable trades' },
  { id: 'profitFactor', name: 'Profit Factor', category: 'performance', description: 'Gross profit / gross loss' },

  // Risk Metrics
  { id: 'volatility', name: 'Volatility', category: 'risk', description: 'Portfolio volatility (annualized)' },
  { id: 'var95', name: 'VaR 95%', category: 'risk', description: 'Value at Risk at 95% confidence' },
  { id: 'cvar95', name: 'CVaR 95%', category: 'risk', description: 'Conditional VaR / Expected Shortfall' },
  { id: 'concentrationRisk', name: 'Concentration Risk', category: 'risk', description: 'Portfolio concentration score (HHI)' },
  { id: 'liquidityScore', name: 'Liquidity Score', category: 'risk', description: 'Estimated days to liquidate' },

  // Trading Metrics
  { id: 'totalTrades', name: 'Total Trades', category: 'trading', description: 'Number of executed trades' },
  { id: 'avgTradeSize', name: 'Avg Trade Size', category: 'trading', description: 'Average trade volume' },
  { id: 'totalFees', name: 'Total Fees', category: 'trading', description: 'Cumulative trading fees paid' },
  { id: 'tradingVolume', name: 'Trading Volume', category: 'trading', description: 'Total trading volume' },
  { id: 'slippage', name: 'Avg Slippage', category: 'trading', description: 'Average execution slippage' },
];

const VISUALIZATION_OPTIONS = [
  { id: 'portfolioValueChart', name: 'Portfolio Value Chart', type: 'line' },
  { id: 'pnlChart', name: 'P&L Chart', type: 'line' },
  { id: 'drawdownChart', name: 'Drawdown Chart', type: 'area' },
  { id: 'allocationPie', name: 'Allocation Pie Chart', type: 'pie' },
  { id: 'correlationHeatmap', name: 'Correlation Heatmap', type: 'heatmap' },
  { id: 'tradeFrequencyHeatmap', name: 'Trade Frequency Heatmap', type: 'heatmap' },
  { id: 'volumeBarChart', name: 'Volume Bar Chart', type: 'bar' },
  { id: 'agentLeaderboard', name: 'Agent Leaderboard Table', type: 'table' },
];

export default function CustomReportBuilder() {
  const [reportName, setReportName] = useState('My Custom Report');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedVisualizations, setSelectedVisualizations] = useState<string[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<ReportTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState<'performance' | 'risk' | 'trading' | 'all'>('all');

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  };

  const toggleVisualization = (vizId: string) => {
    setSelectedVisualizations((prev) =>
      prev.includes(vizId)
        ? prev.filter((id) => id !== vizId)
        : [...prev, vizId]
    );
  };

  const saveTemplate = () => {
    const template: ReportTemplate = {
      id: `template_${Date.now()}`,
      name: reportName,
      metrics: selectedMetrics,
      visualizations: selectedVisualizations,
      createdAt: new Date().toISOString(),
    };

    setSavedTemplates((prev) => [...prev, template]);
    alert(`Template "${reportName}" saved successfully!`);
  };

  const loadTemplate = (template: ReportTemplate) => {
    setReportName(template.name);
    setSelectedMetrics(template.metrics);
    setSelectedVisualizations(template.visualizations);
  };

  const deleteTemplate = (templateId: string) => {
    setSavedTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const generateReport = () => {
    if (selectedMetrics.length === 0 && selectedVisualizations.length === 0) {
      alert('Please select at least one metric or visualization');
      return;
    }

    alert(
      `Generating report "${reportName}" with ${selectedMetrics.length} metrics and ${selectedVisualizations.length} visualizations. This feature will export to PDF/CSV.`
    );
  };

  const filteredMetrics = AVAILABLE_METRICS.filter(
    (metric) => activeCategory === 'all' || metric.category === activeCategory
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Custom Report Builder</h2>
        <p className="text-gray-600 mb-4">
          Build your own custom reports by selecting metrics and visualizations. Save templates for recurring reports.
        </p>

        {/* Report Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
          <input
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter report name..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={generateReport}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Generate Report
          </button>
          <button
            onClick={saveTemplate}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Save as Template
          </button>
          <button
            onClick={() => {
              setSelectedMetrics([]);
              setSelectedVisualizations([]);
            }}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metrics Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Metrics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Metrics</h3>

            {/* Category Filter */}
            <div className="flex gap-2 mb-4">
              {(['all', 'performance', 'risk', 'trading'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredMetrics.map((metric) => (
                <div
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedMetrics.includes(metric.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric.id)}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{metric.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{metric.description}</div>
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${
                          metric.category === 'performance'
                            ? 'bg-green-100 text-green-700'
                            : metric.category === 'risk'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {metric.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visualizations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Visualizations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {VISUALIZATION_OPTIONS.map((viz) => (
                <div
                  key={viz.id}
                  onClick={() => toggleVisualization(viz.id)}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedVisualizations.includes(viz.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedVisualizations.includes(viz.id)}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{viz.name}</div>
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        {viz.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Templates & Preview */}
        <div className="space-y-4">
          {/* Selected Items Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Preview</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Metrics ({selectedMetrics.length})
                </div>
                {selectedMetrics.length > 0 ? (
                  <div className="space-y-1">
                    {selectedMetrics.map((metricId) => {
                      const metric = AVAILABLE_METRICS.find((m) => m.id === metricId);
                      return (
                        <div
                          key={metricId}
                          className="text-sm text-gray-600 flex items-center justify-between"
                        >
                          <span>{metric?.name}</span>
                          <button
                            onClick={() => toggleMetric(metricId)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No metrics selected</div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Visualizations ({selectedVisualizations.length})
                </div>
                {selectedVisualizations.length > 0 ? (
                  <div className="space-y-1">
                    {selectedVisualizations.map((vizId) => {
                      const viz = VISUALIZATION_OPTIONS.find((v) => v.id === vizId);
                      return (
                        <div
                          key={vizId}
                          className="text-sm text-gray-600 flex items-center justify-between"
                        >
                          <span>{viz?.name}</span>
                          <button
                            onClick={() => toggleVisualization(vizId)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No visualizations selected</div>
                )}
              </div>
            </div>
          </div>

          {/* Saved Templates */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Saved Templates ({savedTemplates.length})
            </h3>
            {savedTemplates.length > 0 ? (
              <div className="space-y-2">
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1">{template.name}</div>
                    <div className="text-xs text-gray-500 mb-2">
                      {template.metrics.length} metrics, {template.visualizations.length} visualizations
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadTemplate(template)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">No templates saved yet</div>
            )}
          </div>

          {/* Schedule Report (Future Feature) */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Schedule Report</h3>
            <p className="text-sm text-gray-500 mb-4">
              Coming soon: Schedule automated reports to be generated and emailed daily, weekly, or monthly.
            </p>
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
            >
              Configure Schedule (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
