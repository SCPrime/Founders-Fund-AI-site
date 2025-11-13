/**
 * Report Preview Component
 * Modal to preview report before export
 */

'use client';

import React, { useState, useEffect } from 'react';

interface ReportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: string;
  data: any;
  onConfirmExport?: () => void;
}

export default function ReportPreview({
  isOpen,
  onClose,
  reportType,
  data,
  onConfirmExport,
}: ReportPreviewProps) {
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && data) {
      generatePreviewData();
    }
  }, [isOpen, data, reportType]);

  const generatePreviewData = () => {
    // Generate preview based on report type
    switch (reportType) {
      case 'portfolio-summary':
        setPreviewData(generatePortfolioPreview());
        break;
      case 'agent-performance':
        setPreviewData(generateAgentPreview());
        break;
      case 'trade-history':
        setPreviewData(generateTradeHistoryPreview());
        break;
      case 'multi-agent':
        setPreviewData(generateMultiAgentPreview());
        break;
      default:
        setPreviewData({ title: 'Report Preview', sections: [] });
    }
  };

  const generatePortfolioPreview = () => {
    const { allocationState, allocationOutputs } = data;

    return {
      title: 'Portfolio Performance Summary',
      subtitle: `Period: ${allocationState?.window?.start || 'N/A'} to ${allocationState?.window?.end || 'N/A'}`,
      sections: [
        {
          title: 'Overall Performance',
          items: [
            { label: 'Total Profit', value: formatCurrency(allocationOutputs?.profitTotal || 0) },
            { label: 'Realized Profit', value: formatCurrency(allocationOutputs?.realizedProfit || 0) },
            { label: 'Wallet Size', value: formatCurrency(allocationState?.walletSizeEndOfWindow || 0) },
            { label: 'Total Dollar-Days', value: allocationOutputs?.dollarDays?.total?.toLocaleString() || '0' },
          ],
        },
        {
          title: 'Participant Breakdown',
          items: [
            { label: 'Total Participants', value: Object.keys(allocationOutputs?.dollarDays?.investors || {}).length + 1 },
          ],
        },
      ],
      pageCount: 2,
    };
  };

  const generateAgentPreview = () => {
    const { agentId, dateRange } = data;

    return {
      title: 'Agent Performance Report',
      subtitle: `Last ${dateRange || 30} days`,
      sections: [
        {
          title: 'Performance Metrics',
          items: [
            { label: 'Agent ID', value: agentId || 'N/A' },
            { label: 'Date Range', value: `${dateRange || 30} days` },
          ],
        },
      ],
      pageCount: 3,
    };
  };

  const generateTradeHistoryPreview = () => {
    const { dateRange, agentId, portfolioId } = data;

    return {
      title: 'Trade History Report',
      subtitle: `Last ${dateRange || 30} days`,
      sections: [
        {
          title: 'Report Scope',
          items: [
            { label: 'Date Range', value: `${dateRange || 30} days` },
            { label: 'Scope', value: agentId ? 'Single Agent' : 'Full Portfolio' },
          ],
        },
      ],
      pageCount: 5,
    };
  };

  const generateMultiAgentPreview = () => {
    const { portfolioId, dateRange } = data;

    return {
      title: 'Multi-Agent Consolidated Report',
      subtitle: `Last ${dateRange || 30} days`,
      sections: [
        {
          title: 'Report Details',
          items: [
            { label: 'Date Range', value: `${dateRange || 30} days` },
            { label: 'Portfolio ID', value: portfolioId || 'N/A' },
          ],
        },
      ],
      pageCount: 12,
    };
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {previewData?.title || 'Report Preview'}
              </h2>
              {previewData?.subtitle && (
                <p className="text-sm text-gray-500 mt-1">{previewData.subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {previewData?.sections?.map((section: any, idx: number) => (
              <div key={idx} className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {section.title}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {section.items?.map((item: any, itemIdx: number) => (
                    <div
                      key={itemIdx}
                      className="flex justify-between py-2 border-b border-gray-200 last:border-b-0"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {item.label}:
                      </span>
                      <span className="text-sm text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Page count indicator */}
            {previewData?.pageCount && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    Estimated PDF length: {previewData.pageCount} pages
                  </span>
                </div>
              </div>
            )}

            {/* Feature list */}
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">This report includes:</h4>
              <ul className="space-y-1">
                {[
                  'Professional formatting with headers and footers',
                  'Detailed tables and charts',
                  'Company branding and watermark',
                  'Comprehensive data analysis',
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirmExport?.();
                onClose();
              }}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
