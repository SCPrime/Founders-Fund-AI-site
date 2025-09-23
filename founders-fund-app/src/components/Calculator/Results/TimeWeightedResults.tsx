'use client';

import { useFundStore } from '@/store/fundStore';

export default function TimeWeightedResults() {
  const {
    results,
    summary,
    settings,
    isCalculating,
    lastCalculated,
    validationIssues
  } = useFundStore();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  const hasErrors = validationIssues.some(issue => issue.type === 'error');

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Results (time-weighted)</h2>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {isCalculating ? (
            <span style={{ color: 'var(--warn)' }}>🔄 Calculating...</span>
          ) : lastCalculated ? (
            <span>Updated: {lastCalculated.toLocaleTimeString()}</span>
          ) : (
            <span>Not calculated</span>
          )}
        </div>
      </div>

      <div className="small">
        Window: {settings.winStart} to {settings.winEnd} |
        Total Realized Profit: {formatCurrency(settings.realizedProfit)} |
        Management Fee: {settings.mgmtFeePct}% | Entry Fee: {settings.entryFeePct}%
        {settings.moonbagUnreal > 0 && ` | Unrealized: ${formatCurrency(settings.moonbagUnreal)}`}
      </div>

      {/* Error Warning */}
      {hasErrors && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#c62828',
          fontSize: '12px',
          marginTop: '8px'
        }}>
          ❌ <strong>Calculation errors detected</strong> - Results may be inaccurate. Check validation panel.
        </div>
      )}

      <div className="tablewrap">
        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th>Class / Name</th>
              <th className="right">Start capital</th>
              <th className="right">Contributions</th>
              <th className="right">Dollar-days</th>
              <th className="right">TW Share %</th>
              <th className="right">Base profit</th>
              <th className="right">Fees ({settings.mgmtFeePct}% + {settings.entryFeePct}%)</th>
              <th className="right">Moonbag</th>
              <th className="right">Draws</th>
              <th className="right">Net Profit</th>
              <th className="right">PGP %</th>
              <th className="right">End capital</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={12} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                  {isCalculating ? (
                    'Calculating results...'
                  ) : (
                    'No data available. Add contributions in the table above to see results.'
                  )}
                </td>
              </tr>
            ) : (
              <>
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className={result.cls === 'founder' ? 'founder-row' : 'investor-row'}
                    style={{
                      opacity: isCalculating ? 0.6 : 1,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <td>
                      <strong>{result.name}</strong>
                      <br />
                      <span className="small" style={{
                        color: result.cls === 'founder' ? '#4CAF50' : '#2196f3',
                        fontWeight: 'bold'
                      }}>
                        {result.cls}
                      </span>
                    </td>
                    <td className="right">{formatCurrency(result.startCapital)}</td>
                    <td className="right">{formatCurrency(result.contributions)}</td>
                    <td className="right">
                      <span title={`${result.dollarDays.toLocaleString()} dollar-days`}>
                        {result.dollarDays.toLocaleString()}
                      </span>
                    </td>
                    <td className="right">
                      <strong>{formatPercent(result.twShare)}</strong>
                    </td>
                    <td className="right">{formatCurrency(result.baseProfitShare)}</td>
                    <td className="right" style={{
                      color: result.regularFee > 0 ? '#4CAF50' : result.regularFee < 0 ? '#f44336' : 'inherit'
                    }}>
                      {formatCurrency(result.regularFee)}
                    </td>
                    <td className="right">
                      {result.moonbag > 0 ? (
                        <span style={{ color: 'var(--warn)', fontWeight: 'bold' }}>
                          {formatCurrency(result.moonbag)}
                        </span>
                      ) : (
                        formatCurrency(result.moonbag)
                      )}
                    </td>
                    <td className="right">
                      {result.draws > 0 ? (
                        <span style={{ color: '#f44336' }}>
                          -{formatCurrency(result.draws)}
                        </span>
                      ) : (
                        formatCurrency(result.draws)
                      )}
                    </td>
                    <td className="right">
                      <strong style={{
                        color: result.netProfit > 0 ? '#4CAF50' : result.netProfit < 0 ? '#f44336' : 'inherit',
                        fontSize: '16px'
                      }}>
                        {formatCurrency(result.netProfit)}
                      </strong>
                    </td>
                    <td className="right" style={{
                      color: result.pgp > 0 ? '#4CAF50' : result.pgp < 0 ? '#f44336' : 'inherit'
                    }}>
                      {formatPercent(result.pgp)}
                    </td>
                    <td className="right">{formatCurrency(result.endCapital)}</td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="total-row" style={{
                  borderTop: '2px solid var(--line)',
                  fontWeight: 'bold',
                  backgroundColor: 'var(--panel)'
                }}>
                  <td>
                    <strong>TOTALS</strong>
                    <br />
                    <span className="small">{results.length} participants</span>
                  </td>
                  <td className="right">
                    {formatCurrency(results.reduce((sum, r) => sum + r.startCapital, 0))}
                  </td>
                  <td className="right">
                    <strong>{formatCurrency(summary.totalContributions)}</strong>
                  </td>
                  <td className="right">
                    <span title={`${summary.totalDollarDays.toLocaleString()} total dollar-days over ${summary.windowDays} days`}>
                      {summary.totalDollarDays.toLocaleString()}
                    </span>
                  </td>
                  <td className="right">
                    <strong>100.0%</strong>
                  </td>
                  <td className="right">
                    <strong>{formatCurrency(summary.totalBaseProfitShare)}</strong>
                  </td>
                  <td className="right" style={{
                    color: summary.totalFees > 0 ? '#4CAF50' : summary.totalFees < 0 ? '#f44336' : 'inherit'
                  }}>
                    <strong>{formatCurrency(summary.totalFees)}</strong>
                  </td>
                  <td className="right">
                    <strong style={{ color: 'var(--warn)' }}>
                      {formatCurrency(summary.totalMoonbagDistributed)}
                    </strong>
                  </td>
                  <td className="right">
                    <strong style={{ color: '#f44336' }}>
                      -{formatCurrency(summary.totalDraws)}
                    </strong>
                  </td>
                  <td className="right">
                    <strong style={{
                      color: summary.totalNetProfit > 0 ? '#4CAF50' : summary.totalNetProfit < 0 ? '#f44336' : 'inherit',
                      fontSize: '18px'
                    }}>
                      {formatCurrency(summary.totalNetProfit)}
                    </strong>
                  </td>
                  <td className="right">-</td>
                  <td className="right">
                    <strong>{formatCurrency(results.reduce((sum, r) => sum + r.endCapital, 0))}</strong>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'var(--ink)',
          border: '1px solid var(--line)',
          borderRadius: '6px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Fee Collection</div>
            <div style={{ fontWeight: 'bold', color: 'var(--good)' }}>
              Mgmt: {formatCurrency(summary.totalMgmtFeesCollected)}
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--good)' }}>
              Entry: {formatCurrency(summary.totalEntryFeesCollected)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Moonbag Distribution</div>
            <div style={{ fontWeight: 'bold', color: 'var(--warn)' }}>
              Founders: {formatPercent(settings.moonbagFounderPct)}
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--warn)' }}>
              Investors: {formatPercent(100 - settings.moonbagFounderPct)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Performance</div>
            <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>
              ROI: {formatPercent(summary.totalContributions > 0 ? (summary.totalNetProfit / summary.totalContributions) * 100 : 0)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Over {summary.windowDays} days
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Validation</div>
            <div style={{
              fontWeight: 'bold',
              color: hasErrors ? 'var(--bad)' : validationIssues.length > 0 ? 'var(--warn)' : 'var(--good)'
            }}>
              {hasErrors ? '❌ Errors' : validationIssues.length > 0 ? '⚠️ Warnings' : '✅ Valid'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {validationIssues.length} issue{validationIssues.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      <div className="small" id="domNote" style={{ marginTop: '8px', color: 'var(--muted)' }}>
        {settings.domLeadPct > 0 && (
          <>Dominant Lead Fee: {settings.domLeadPct}% applied to calculations above. • </>
        )}
        💡 <strong>Powered by Fund Store:</strong> Real-time calculations with automatic validation
      </div>
    </div>
  );
}