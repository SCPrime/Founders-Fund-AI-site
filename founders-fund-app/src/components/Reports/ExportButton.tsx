/**
 * Enhanced Export Button Component with Dropdown
 * Supports PDF, CSV, and Excel exports with format selection
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';

export type ExportFormat = 'pdf' | 'csv' | 'excel';
export type ReportType =
  | 'portfolio-summary'
  | 'agent-performance'
  | 'trade-history'
  | 'multi-agent';

interface ExportButtonProps {
  reportType: ReportType;
  data: any;
  label?: string;
  className?: string;
  formats?: ExportFormat[];
  onExportStart?: (format: ExportFormat) => void;
  onExportComplete?: (format: ExportFormat, success: boolean) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export default function ExportButton({
  reportType,
  data,
  label = 'Export',
  className = '',
  formats = ['pdf', 'csv', 'excel'],
  onExportStart,
  onExportComplete,
  disabled = false,
  variant = 'primary',
  size = 'md',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    setIsExporting(true);
    setCurrentFormat(format);
    onExportStart?.(format);

    try {
      if (format === 'pdf') {
        await exportPDF();
      } else if (format === 'csv') {
        await exportCSV();
      } else if (format === 'excel') {
        await exportExcel();
      }

      onExportComplete?.(format, true);
    } catch (error) {
      console.error(`Export ${format} failed:`, error);
      alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onExportComplete?.(format, false);
    } finally {
      setIsExporting(false);
      setCurrentFormat(null);
    }
  };

  const exportPDF = async () => {
    const endpoint = `/api/reports/${reportType}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        options: {
          saveToDatabase: true,
          includeCharts: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'PDF generation failed');
    }

    // Download the PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName('pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    // Convert data to CSV format
    let csvContent = '';

    if (reportType === 'trade-history' && data.trades) {
      // CSV for trade history
      const headers = ['Date', 'Agent', 'Symbol', 'Side', 'Amount', 'Price', 'Value', 'Fees', 'P&L'];
      csvContent = headers.join(',') + '\n';

      data.trades.forEach((trade: any) => {
        const row = [
          trade.date || '',
          trade.agentName || '',
          trade.symbol || '',
          trade.type || '',
          trade.amount || 0,
          trade.price || 0,
          trade.value || 0,
          trade.fees || 0,
          trade.profit !== undefined ? trade.profit : '',
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (reportType === 'portfolio-summary' && data.allocationOutputs) {
      // CSV for portfolio summary
      const outputs = data.allocationOutputs;
      csvContent = 'Participant,Type,Dollar Days,Share %,Realized Net,Moonbag,End Capital\n';

      // Founders
      if (outputs.dollarDays.founders > 0) {
        csvContent += `Founders,founders,${outputs.dollarDays.founders},${(outputs.shares.founders * 100).toFixed(2)},${outputs.realizedNet.founders},${outputs.moonbag.founders},${outputs.endCapital.founders}\n`;
      }

      // Investors
      Object.entries(outputs.dollarDays.investors).forEach(([name, dollarDays]) => {
        csvContent += `${name},investor,${dollarDays},${((outputs.shares.investors[name] || 0) * 100).toFixed(2)},${outputs.realizedNet.investors[name] || 0},${outputs.moonbag.investors[name] || 0},${outputs.endCapital.investors[name] || 0}\n`;
      });
    } else {
      throw new Error('CSV export not supported for this report type');
    }

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName('csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    // For now, export as CSV with .xlsx extension
    // In production, use a library like xlsx or exceljs
    await exportCSV();
    alert('Excel export uses CSV format. For true Excel format, install xlsx library.');
  };

  const getFileName = (extension: string): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${reportType}-${timestamp}.${extension}`;
  };

  // Style variants
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const buttonClass = `
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
    inline-flex items-center justify-center gap-2 rounded-lg font-medium
    transition-colors disabled:opacity-50 disabled:cursor-not-allowed
  `.trim();

  const formatLabels: Record<ExportFormat, string> = {
    pdf: 'PDF Document',
    csv: 'CSV Spreadsheet',
    excel: 'Excel Workbook',
  };

  const formatIcons: Record<ExportFormat, string> = {
    pdf: '📄',
    csv: '📊',
    excel: '📗',
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={buttonClass}
      >
        {isExporting ? (
          <>
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Exporting {currentFormat?.toUpperCase()}...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>{label}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isExporting && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu">
            {formats.map((format) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                role="menuitem"
              >
                <span className="text-xl">{formatIcons[format]}</span>
                <div>
                  <div className="font-medium">{formatLabels[format]}</div>
                  <div className="text-xs text-gray-500">
                    {format === 'pdf' && 'Professional report with charts'}
                    {format === 'csv' && 'Raw data for analysis'}
                    {format === 'excel' && 'Formatted spreadsheet'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
