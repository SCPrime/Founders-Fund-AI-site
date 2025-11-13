/**
 * Export PDF Button Component
 * Reusable button for exporting various report types to PDF
 */

'use client';

import React, { useState } from 'react';
import type { AllocationState, AllocationOutputs } from '@/types/allocation';

interface ExportPDFButtonProps {
  reportType: 'individual-investor' | 'portfolio-performance' | 'agent-performance' | 'agent-comparison';
  data?: any;
  allocationState?: AllocationState;
  allocationOutputs?: AllocationOutputs;
  investorName?: string;
  filename?: string;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const ExportPDFButton: React.FC<ExportPDFButtonProps> = ({
  reportType,
  data,
  allocationState,
  allocationOutputs,
  investorName,
  filename,
  label = 'Export to PDF',
  style,
  className = 'button',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const requestBody: any = {
        reportType,
        filename,
      };

      // Add data based on report type
      if (data) {
        requestBody.data = data;
      }

      if (allocationState && allocationOutputs) {
        requestBody.allocationState = allocationState;
        requestBody.allocationOutputs = allocationOutputs;
      }

      if (investorName) {
        requestBody.investorName = investorName;
      }

      const response = await fetch('/api/reports/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Extract filename from Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = filename || 'report.pdf';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          downloadFilename = filenameMatch[1];
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Success feedback
      console.log('PDF exported successfully:', downloadFilename);
    } catch (err) {
      console.error('PDF export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
      alert(`Failed to export PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={className}
        style={{
          ...style,
          opacity: isExporting ? 0.6 : 1,
          cursor: isExporting ? 'wait' : 'pointer',
        }}
      >
        {isExporting ? 'Generating PDF...' : label}
      </button>
      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '4px',
            color: '#c62828',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};

export default ExportPDFButton;
