'use client';

import { useState, useEffect } from 'react';
import { useFundStore } from '@/store/fundStore';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

export default function SmartValidation() {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const { settings, updateSettings } = useFundStore();

  const validateData = async () => {
    setIsValidating(true);
    const validationIssues: ValidationIssue[] = [];

    // Basic validation rules
    if (settings.walletSize <= 0) {
      validationIssues.push({
        severity: 'error',
        field: 'walletSize',
        message: 'Wallet size must be greater than 0',
        suggestion: 'Add founder contributions or set initial capital'
      });
    }

    if (settings.walletSize < 1000 && settings.walletSize > 0) {
      validationIssues.push({
        severity: 'warning',
        field: 'walletSize',
        message: 'Very small wallet size may not be practical',
        suggestion: 'Consider minimum viable fund size of $10,000+'
      });
    }

    if (settings.mgmtFeePct > 30) {
      validationIssues.push({
        severity: 'warning',
        field: 'mgmtFeePct',
        message: 'Management fee appears high (>30%)',
        suggestion: 'Industry standard is typically 15-25%'
      });
    }

    if (settings.entryFeePct > 20) {
      validationIssues.push({
        severity: 'warning',
        field: 'entryFeePct',
        message: 'Entry fee appears high (>20%)',
        suggestion: 'Consider reducing to improve investor appeal'
      });
    }

    if (settings.mgmtFeePct + settings.entryFeePct > 40) {
      validationIssues.push({
        severity: 'error',
        field: 'totalFees',
        message: 'Combined fees are extremely high (>40%)',
        suggestion: 'Total fees should rarely exceed 30-35%'
      });
    }

    if (settings.founderCount <= 0) {
      validationIssues.push({
        severity: 'error',
        field: 'founderCount',
        message: 'At least one founder is required',
        suggestion: 'Set founder count to at least 1'
      });
    }

    if (settings.founderCount > 10) {
      validationIssues.push({
        severity: 'warning',
        field: 'founderCount',
        message: 'High founder count may complicate governance',
        suggestion: 'Consider if all parties need founder status'
      });
    }

    if (settings.realizedProfit < 0) {
      validationIssues.push({
        severity: 'info',
        field: 'realizedProfit',
        message: 'Negative realized profit indicates losses',
        suggestion: 'Monitor investment performance and risk management'
      });
    }

    if (settings.moonbagUnreal > settings.moonbagReal * 5 && settings.moonbagReal > 0) {
      validationIssues.push({
        severity: 'warning',
        field: 'moonbagUnreal',
        message: 'High unrealized exposure (>5x realized)',
        suggestion: 'Consider taking some profits to reduce risk'
      });
    }

    if (settings.drawPerFounder > settings.walletSize / settings.founderCount * 0.5 && settings.walletSize > 0) {
      validationIssues.push({
        severity: 'warning',
        field: 'drawPerFounder',
        message: 'High founder draws relative to capital',
        suggestion: 'Ensure sufficient capital remains for investments'
      });
    }

    // Date validation
    if (settings.winStart && settings.winEnd && new Date(settings.winStart) >= new Date(settings.winEnd)) {
      validationIssues.push({
        severity: 'error',
        field: 'dateRange',
        message: 'Start date must be before end date',
        suggestion: 'Adjust the window start and end dates'
      });
    }

    // Enhanced rule-based validation
    const totalAssets = settings.walletSize + settings.moonbagReal + settings.moonbagUnreal;
    const profitRatio = totalAssets > 0 ? (settings.realizedProfit / totalAssets) : 0;

    if (profitRatio > 2) {
      validationIssues.push({
        severity: 'info',
        field: 'performance',
        message: 'Excellent profit performance (>200% ROI)',
        suggestion: 'Consider profit-taking strategies and risk management'
      });
    } else if (profitRatio > 0.5) {
      validationIssues.push({
        severity: 'info',
        field: 'performance',
        message: 'Good profit performance (>50% ROI)',
        suggestion: 'Performance is above average for venture funds'
      });
    }

    if (settings.walletSize > 0 && settings.realizedProfit > 0) {
      const feeImpact = (settings.mgmtFeePct + settings.entryFeePct) / 100;
      const netReturn = profitRatio * (1 - feeImpact);

      if (netReturn < 0.1 && profitRatio > 0.1) {
        validationIssues.push({
          severity: 'warning',
          field: 'feeImpact',
          message: 'High fees significantly reducing investor returns',
          suggestion: 'Consider reducing fees to improve investor appeal'
        });
      }
    }

    // Performance insights
    if (validationIssues.length === 0) {
      validationIssues.push({
        severity: 'info',
        field: 'overall',
        message: 'Fund configuration looks healthy',
        suggestion: 'All major validation checks passed successfully'
      });
    }

    setIssues(validationIssues);
    setIsValidating(false);
  };

  // Auto-validate when key settings change
  useEffect(() => {
    const timer = setTimeout(() => {
      validateData();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.walletSize,
    settings.mgmtFeePct,
    settings.entryFeePct,
    settings.founderCount,
    settings.realizedProfit,
    settings.moonbagReal,
    settings.moonbagUnreal,
    settings.winStart,
    settings.winEnd
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#666';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  };

  const applyQuickFix = (issue: ValidationIssue) => {
    switch (issue.field) {
      case 'walletSize':
        if (settings.walletSize <= 0) {
          updateSettings({ walletSize: 10000 });
        }
        break;
      case 'mgmtFeePct':
        if (settings.mgmtFeePct > 30) {
          updateSettings({ mgmtFeePct: 20 });
        }
        break;
      case 'entryFeePct':
        if (settings.entryFeePct > 20) {
          updateSettings({ entryFeePct: 10 });
        }
        break;
      case 'founderCount':
        if (settings.founderCount <= 0) {
          updateSettings({ founderCount: 1 });
        } else if (settings.founderCount > 10) {
          updateSettings({ founderCount: 5 });
        }
        break;
    }
  };

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  return (
    <div className="panel" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3>🔍 Smart Validation</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {errorCount > 0 && (
            <span style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)', color: 'var(--bad)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span style={{ backgroundColor: 'rgba(255, 176, 32, 0.2)', color: 'var(--warn)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={validateData}
            disabled={isValidating}
            className="btn"
            style={{
              padding: '4px 8px',
              fontSize: '12px'
            }}
          >
            {isValidating ? '⏳' : '🔄'} Revalidate
          </button>
        </div>
      </div>

      {issues.length === 0 && !isValidating && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(53, 199, 89, 0.1)',
          border: '1px solid var(--good)',
          borderRadius: '4px',
          color: 'var(--good)',
          textAlign: 'center'
        }}>
          ✅ All validations passed! Your fund settings look good.
        </div>
      )}

      {issues.length > 0 && (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {issues.map((issue, index) => (
            <div key={index} style={{
              marginBottom: '8px',
              padding: '10px',
              border: `1px solid ${getSeverityColor(issue.severity)}`,
              borderRadius: '4px',
              backgroundColor: issue.severity === 'error' ? 'rgba(255, 107, 107, 0.1)' : issue.severity === 'warning' ? 'rgba(255, 176, 32, 0.1)' : 'rgba(57, 208, 216, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: getSeverityColor(issue.severity),
                    marginBottom: '4px',
                    fontSize: '13px'
                  }}>
                    {getSeverityIcon(issue.severity)} {issue.message}
                  </div>
                  {issue.suggestion && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                      💡 {issue.suggestion}
                    </div>
                  )}
                </div>
                {['walletSize', 'mgmtFeePct', 'entryFeePct', 'founderCount'].includes(issue.field) && (
                  <button
                    onClick={() => applyQuickFix(issue)}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      backgroundColor: getSeverityColor(issue.severity),
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Quick Fix
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>
        💡 Validation runs automatically when you change settings. Use Quick Fix buttons for common issues.
      </div>
    </div>
  );
}