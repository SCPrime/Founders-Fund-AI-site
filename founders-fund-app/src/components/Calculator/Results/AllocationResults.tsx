'use client';

import { ExportPDFButton } from '@/components/Reports/ExportPDFButton';
import { useAllocationStore } from '@/store/allocationStore';

export default function AllocationResults() {
  const { state, outputs, validationErrors, isComputing, lastComputeTime } = useAllocationStore();

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

  const hasErrors = validationErrors.some((issue) => issue.type === 'error');

  if (!outputs) {
    return (
      <div className="panel">
        <h2>Allocation Results</h2>
        <div className="tablewrap">
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
            {isComputing
              ? 'Computing allocations...'
              : 'No data available. Add contributions to see results.'}
          </div>
        </div>
      </div>
    );
  }

  // Convert allocation data to display format
  const allParticipants: Array<{
    name: string;
    type: 'founders' | 'investor';
    dollarDays: number;
    share: number;
    realizedGross: number;
    realizedNet: number;
    managementFee: number;
    moonbag: number;
    endCapital: number;
  }> = [];

  // Add founders
  if (outputs.dollarDays.founders > 0) {
    allParticipants.push({
      name: 'Founders',
      type: 'founders',
      dollarDays: outputs.dollarDays.founders,
      share: outputs.shares.founders * 100,
      realizedGross: outputs.realizedGross.founders,
      realizedNet: outputs.realizedNet.founders,
      managementFee: outputs.managementFees.foundersCarryTotal,
      moonbag: outputs.moonbag.founders,
      endCapital: outputs.endCapital.founders,
    });
  }

  // Add investors
  Object.entries(outputs.dollarDays.investors).forEach(([name, dollarDays]) => {
    if (dollarDays > 0) {
      allParticipants.push({
        name,
        type: 'investor',
        dollarDays,
        share: (outputs.shares.investors[name] || 0) * 100,
        realizedGross: outputs.realizedGross.investors[name] || 0,
        realizedNet: outputs.realizedNet.investors[name] || 0,
        managementFee: -(outputs.managementFees.investors[name] || 0), // Negative because they pay
        moonbag: outputs.moonbag.investors[name] || 0,
        endCapital: outputs.endCapital.investors[name] || 0,
      });
    }
  });

  // Calculate totals
  const totals = {
    dollarDays: outputs.dollarDays.total,
    realizedGross:
      outputs.realizedGross.founders +
      Object.values(outputs.realizedGross.investors).reduce((s, v) => s + v, 0),
    realizedNet:
      outputs.realizedNet.founders +
      Object.values(outputs.realizedNet.investors).reduce((s, v) => s + v, 0),
    managementFees:
      outputs.managementFees.foundersCarryTotal -
      Object.values(outputs.managementFees.investors).reduce((s, v) => s + v, 0),
    moonbag:
      outputs.moonbag.founders +
      Object.values(outputs.moonbag.investors).reduce((s, v) => s + v, 0),
    endCapital:
      outputs.endCapital.founders +
      Object.values(outputs.endCapital.investors).reduce((s, v) => s + v, 0),
  };

  return (
    <div className="panel">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
        }}
      >
        <h2>Allocation Results</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {outputs && (
            <ExportPDFButton
              reportType="portfolio-performance"
              allocationState={state}
              allocationOutputs={outputs}
              label="Export Portfolio PDF"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            />
          )}
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {isComputing ? (
              <span style={{ color: 'var(--warn)' }}>🔄 Computing...</span>
            ) : lastComputeTime ? (
              <span>Updated: {new Date(lastComputeTime).toLocaleTimeString()}</span>
            ) : (
              <span>Not calculated</span>
            )}
          </div>
        </div>
      </div>

      <div className="small">
        Window: {state.window.start} to {state.window.end} | Total Profit:{' '}
        {formatCurrency(outputs.profitTotal)} | Realized: {formatCurrency(outputs.realizedProfit)} |
        Unrealized: {formatCurrency(outputs.profitTotal - outputs.realizedProfit)} | Mgmt Fee:{' '}
        {formatPercent(state.constants.MGMT_FEE_RATE * 100)} | Entry Fee:{' '}
        {formatPercent(state.constants.ENTRY_FEE_RATE * 100)}
      </div>

      {/* Error Warning */}
      {hasErrors && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            borderRadius: '4px',
            color: '#c62828',
            fontSize: '12px',
            marginTop: '8px',
          }}
        >
          ❌ <strong>Allocation errors detected</strong> - Results may be inaccurate. Check
          validation panel.
        </div>
      )}

      <div className="tablewrap">
        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th className="right">Dollar-days</th>
              <th className="right">Share %</th>
              <th className="right">Realized Gross</th>
              <th className="right">Realized Net</th>
              <th className="right">Mgmt Fee</th>
              <th className="right">Moonbag</th>
              <th className="right">End Capital</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allParticipants.length === 0 ? (
              <tr>
                <td colSpan={10} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                  {isComputing
                    ? 'Computing results...'
                    : 'No participants found. Add contributions to see results.'}
                </td>
              </tr>
            ) : (
              <>
                {allParticipants.map((participant, index) => (
                  <tr
                    key={`${participant.name}-${index}`}
                    className={participant.type === 'founders' ? 'founder-row' : 'investor-row'}
                    style={{
                      opacity: isComputing ? 0.6 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <td>
                      <strong>{participant.name}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          color: participant.type === 'founders' ? '#4CAF50' : '#2196f3',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        {participant.type === 'founders' ? 'FOUNDER' : 'INVESTOR'}
                      </span>
                    </td>
                    <td className="right">
                      <span title={`${participant.dollarDays.toLocaleString()} dollar-days`}>
                        {participant.dollarDays.toLocaleString()}
                      </span>
                    </td>
                    <td className="right">
                      <strong>{formatPercent(participant.share)}</strong>
                    </td>
                    <td className="right">{formatCurrency(participant.realizedGross)}</td>
                    <td className="right">
                      <strong
                        style={{
                          color:
                            participant.realizedNet > 0
                              ? '#4CAF50'
                              : participant.realizedNet < 0
                                ? '#f44336'
                                : 'inherit',
                        }}
                      >
                        {formatCurrency(participant.realizedNet)}
                      </strong>
                    </td>
                    <td
                      className="right"
                      style={{
                        color:
                          participant.managementFee > 0
                            ? '#4CAF50'
                            : participant.managementFee < 0
                              ? '#f44336'
                              : 'inherit',
                      }}
                    >
                      {formatCurrency(participant.managementFee)}
                    </td>
                    <td className="right">
                      {participant.moonbag > 0 ? (
                        <span style={{ color: 'var(--warn)', fontWeight: 'bold' }}>
                          {formatCurrency(participant.moonbag)}
                        </span>
                      ) : (
                        formatCurrency(participant.moonbag)
                      )}
                    </td>
                    <td className="right">{formatCurrency(participant.endCapital)}</td>
                    <td>
                      {participant.type === 'investor' && (
                        <ExportPDFButton
                          reportType="individual-investor"
                          allocationState={state}
                          allocationOutputs={outputs}
                          investorName={participant.name}
                          label="PDF"
                          style={{
                            padding: '4px 8px',
                            fontSize: '10px',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr
                  className="total-row"
                  style={{
                    borderTop: '2px solid var(--line)',
                    fontWeight: 'bold',
                    backgroundColor: 'var(--panel)',
                  }}
                >
                  <td>
                    <strong>TOTALS</strong>
                    <br />
                    <span className="small">{allParticipants.length} participants</span>
                  </td>
                  <td>-</td>
                  <td className="right">
                    <span title={`${totals.dollarDays.toLocaleString()} total dollar-days`}>
                      {totals.dollarDays.toLocaleString()}
                    </span>
                  </td>
                  <td className="right">
                    <strong>100.0%</strong>
                  </td>
                  <td className="right">
                    <strong>{formatCurrency(totals.realizedGross)}</strong>
                  </td>
                  <td className="right">
                    <strong
                      style={{
                        color:
                          totals.realizedNet > 0
                            ? '#4CAF50'
                            : totals.realizedNet < 0
                              ? '#f44336'
                              : 'inherit',
                        fontSize: '18px',
                      }}
                    >
                      {formatCurrency(totals.realizedNet)}
                    </strong>
                  </td>
                  <td className="right">
                    <strong style={{ color: 'var(--good)' }}>
                      {formatCurrency(totals.managementFees)}
                    </strong>
                  </td>
                  <td className="right">
                    <strong style={{ color: 'var(--warn)' }}>
                      {formatCurrency(totals.moonbag)}
                    </strong>
                  </td>
                  <td className="right">
                    <strong>{formatCurrency(totals.endCapital)}</strong>
                  </td>
                  <td>-</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      {allParticipants.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Profit Distribution</div>
            <div style={{ fontWeight: 'bold', color: 'var(--text)' }}>
              Realized: {formatCurrency(outputs.realizedProfit)}
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--warn)' }}>
              Unrealized: {formatCurrency(outputs.profitTotal - outputs.realizedProfit)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Fee Structure</div>
            <div style={{ fontWeight: 'bold', color: 'var(--good)' }}>
              Mgmt: {formatPercent(state.constants.MGMT_FEE_RATE * 100)}
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--good)' }}>
              Entry: {formatPercent(state.constants.ENTRY_FEE_RATE * 100)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Moonbag Split</div>
            <div style={{ fontWeight: 'bold', color: 'var(--warn)' }}>
              Founders: {formatPercent(state.constants.FOUNDERS_MOONBAG_PCT * 100)}
            </div>
            <div style={{ fontWeight: 'bold', color: 'var(--warn)' }}>
              Investors: {formatPercent((1 - state.constants.FOUNDERS_MOONBAG_PCT) * 100)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Validation</div>
            <div
              style={{
                fontWeight: 'bold',
                color: hasErrors
                  ? 'var(--bad)'
                  : validationErrors.length > 0
                    ? 'var(--warn)'
                    : 'var(--good)',
              }}
            >
              {hasErrors ? '❌ Errors' : validationErrors.length > 0 ? '⚠️ Warnings' : '✅ Valid'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {validationErrors.length} issue{validationErrors.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      <div className="small" style={{ marginTop: '8px', color: 'var(--muted)' }}>
        💡 <strong>Powered by AllocationEngine:</strong> Real-time time-weighted calculations with
        comprehensive validation
      </div>
    </div>
  );
}
