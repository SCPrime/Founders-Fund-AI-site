'use client';

import { useState, useEffect } from 'react';
import { useCalculator } from '@/context/CalculatorContext';

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

export default function SmartValidation() {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const calc = useCalculator();

  const validateData = async () => {
    setIsValidating(true);
    const validationIssues: ValidationIssue[] = [];

    // Basic validation rules
    if (calc.walletSize <= 0) {
      validationIssues.push({
        severity: 'error',
        field: 'walletSize',
        message: 'Wallet size must be greater than 0',
        suggestion: 'Add founder contributions or set initial capital'
      });
    }

    if (calc.walletSize < 1000 && calc.walletSize > 0) {
      validationIssues.push({
        severity: 'warning',
        field: 'walletSize',
        message: 'Very small wallet size may not be practical',
        suggestion: 'Consider minimum viable fund size of $10,000+'
      });
    }

    if (calc.mgmtFeePct > 30) {
      validationIssues.push({
        severity: 'warning',
        field: 'mgmtFeePct',
        message: 'Management fee appears high (>30%)',
        suggestion: 'Industry standard is typically 15-25%'
      });
    }

    if (calc.entryFeePct > 20) {
      validationIssues.push({
        severity: 'warning',
        field: 'entryFeePct',
        message: 'Entry fee appears high (>20%)',
        suggestion: 'Consider reducing to improve investor appeal'
      });
    }

    if (calc.mgmtFeePct + calc.entryFeePct > 40) {
      validationIssues.push({
        severity: 'error',
        field: 'totalFees',
        message: 'Combined fees are extremely high (>40%)',
        suggestion: 'Total fees should rarely exceed 30-35%'
      });
    }

    if (calc.founderCount <= 0) {
      validationIssues.push({
        severity: 'error',
        field: 'founderCount',
        message: 'At least one founder is required',
        suggestion: 'Set founder count to at least 1'
      });
    }

    if (calc.founderCount > 10) {
      validationIssues.push({
        severity: 'warning',
        field: 'founderCount',
        message: 'High founder count may complicate governance',
        suggestion: 'Consider if all parties need founder status'
      });
    }

    if (calc.realizedProfit < 0) {
      validationIssues.push({
        severity: 'info',
        field: 'realizedProfit',
        message: 'Negative realized profit indicates losses',
        suggestion: 'Monitor investment performance and risk management'
      });
    }

    if (calc.moonbagUnreal > calc.moonbagReal * 5 && calc.moonbagReal > 0) {
      validationIssues.push({
        severity: 'warning',
        field: 'moonbagUnreal',
        message: 'High unrealized exposure (>5x realized)',
        suggestion: 'Consider taking some profits to reduce risk'
      });
    }

    if (calc.drawPerFounder > calc.walletSize / calc.founderCount * 0.5 && calc.walletSize > 0) {
      validationIssues.push({
        severity: 'warning',
        field: 'drawPerFounder',
        message: 'High founder draws relative to capital',
        suggestion: 'Ensure sufficient capital remains for investments'
      });
    }

    // Date validation
    if (calc.winStart && calc.winEnd && new Date(calc.winStart) >= new Date(calc.winEnd)) {
      validationIssues.push({
        severity: 'error',
        field: 'dateRange',
        message: 'Start date must be before end date',
        suggestion: 'Adjust the window start and end dates'
      });
    }

    // Enhanced rule-based validation
    const totalAssets = calc.walletSize + calc.moonbagReal + calc.moonbagUnreal;
    const profitRatio = totalAssets > 0 ? (calc.realizedProfit / totalAssets) : 0;

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

    if (calc.walletSize > 0 && calc.realizedProfit > 0) {
      const feeImpact = (calc.mgmtFeePct + calc.entryFeePct) / 100;
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
    calc.walletSize,
    calc.mgmtFeePct,
    calc.entryFeePct,
    calc.founderCount,
    calc.realizedProfit,
    calc.moonbagReal,
    calc.moonbagUnreal,
    calc.winStart,
    calc.winEnd
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
        if (calc.walletSize <= 0) {
          calc.setWalletSize(10000);
        }
        break;
      case 'mgmtFeePct':
        if (calc.mgmtFeePct > 30) {
          calc.setMgmtFeePct(20);
        }
        break;
      case 'entryFeePct':
        if (calc.entryFeePct > 20) {
          calc.setEntryFeePct(10);
        }
        break;
      case 'founderCount':
        if (calc.founderCount <= 0) {
          calc.setFounderCount(1);
        } else if (calc.founderCount > 10) {
          calc.setFounderCount(5);
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