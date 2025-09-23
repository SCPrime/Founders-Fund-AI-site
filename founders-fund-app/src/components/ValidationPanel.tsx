'use client';

import { useFundStore } from '@/store/fundStore';

export default function ValidationPanel() {
  const {
    validationIssues,
    clearValidationIssues,
    validateData,
    summary,
    lastCalculated,
    isCalculating
  } = useFundStore();

  const hasErrors = validationIssues.some(issue => issue.type === 'error');

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Fund Validation</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn"
            onClick={validateData}
            disabled={isCalculating}
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--ink)',
              border: '1px solid var(--accent)'
            }}
          >
            {isCalculating ? '⏳ Calculating...' : '🔍 Revalidate'}
          </button>
          {validationIssues.length > 0 && (
            <button
              className="btn"
              onClick={clearValidationIssues}
            >
              Clear Issues
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: 'var(--ink)',
        border: '1px solid var(--line)',
        borderRadius: '6px'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Total Contributions</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>${summary.totalContributions.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Total Profit</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>${summary.totalNetProfit.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Dollar-Days</div>
          <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>{summary.totalDollarDays.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Last Calculated</div>
          <div style={{ fontSize: '11px', color: 'var(--text)' }}>
            {lastCalculated ? lastCalculated.toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div style={{ marginBottom: '16px' }}>
        {validationIssues.length === 0 ? (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(53, 199, 89, 0.1)',
            border: '1px solid var(--good)',
            borderRadius: '6px',
            color: 'var(--good)'
          }}>
            ✅ <strong>All validations passed!</strong> Your fund calculations look good.
          </div>
        ) : (
          <div style={{
            padding: '12px',
            backgroundColor: hasErrors ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 176, 32, 0.1)',
            border: `1px solid ${hasErrors ? 'var(--bad)' : 'var(--warn)'}`,
            borderRadius: '6px',
            color: hasErrors ? 'var(--bad)' : 'var(--warn)'
          }}>
            {hasErrors ? '❌' : '⚠️'} <strong>
              {validationIssues.length} validation issue{validationIssues.length > 1 ? 's' : ''} found
            </strong>
            {hasErrors && ' - Please fix errors before proceeding'}
          </div>
        )}
      </div>

      {/* Validation Issues List */}
      {validationIssues.length > 0 && (
        <div>
          <h4>Issues:</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {validationIssues.map((issue) => (
              <div
                key={issue.id}
                style={{
                  padding: '8px 12px',
                  marginBottom: '6px',
                  backgroundColor: 'var(--panel)',
                  border: `1px solid ${
                    issue.type === 'error' ? 'var(--bad)' :
                    issue.type === 'warning' ? 'var(--warn)' : 'var(--accent)'
                  }`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: 'var(--text)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      marginBottom: '2px'
                    }}>
                      {issue.type === 'error' ? '❌ ERROR' :
                       issue.type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO'}
                      {issue.field && ` - ${issue.field}`}
                    </div>
                    <div style={{ color: 'var(--text)' }}>{issue.message}</div>
                  </div>
                  {issue.quickFix && (
                    <button
                      onClick={issue.quickFix}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        backgroundColor: 'var(--good)',
                        color: 'var(--text)',
                        border: '1px solid var(--good)',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        marginLeft: '8px'
                      }}
                    >
                      {issue.quickFixLabel || 'Quick Fix'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        color: 'var(--muted)',
        fontStyle: 'italic'
      }}>
        💡 The validation system automatically checks for common issues and provides suggestions for fixes.
      </div>
    </div>
  );
}