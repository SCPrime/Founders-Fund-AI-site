'use client';

import { useAllocationStore } from '@/store/allocationStore';

export default function AllocationSettings() {
  const { state, wallet, updateWindow, updateConstants } = useAllocationStore();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="panel">
      <h2>Allocation Settings</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(12,1fr)', gap: '12px' }}>

        {/* Window Start */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="winStart">Window Start</label>
          <input
            id="winStart"
            type="date"
            value={state.window.start}
            onChange={(e) => updateWindow({ ...state.window, start: e.target.value })}
          />
        </div>

        {/* Window End */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="winEnd">Window End</label>
          <input
            id="winEnd"
            type="date"
            value={state.window.end}
            onChange={(e) => updateWindow({ ...state.window, end: e.target.value })}
          />
        </div>

        {/* Wallet Size - Read Only */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="walletSize">Wallet Size ($)</label>
          <div
            data-testid="wallet-size-value"
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: wallet.size ? 'var(--text)' : 'var(--muted)',
              fontSize: '14px'
            }}
          >
            {wallet.size ? formatCurrency(wallet.size) : 'Awaiting screenshot…'}
          </div>
          {wallet.source === 'screenshot' && wallet.lastUpdateAt && (
            <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
              From screenshot: {new Date(wallet.lastUpdateAt).toLocaleString()}
            </small>
          )}
        </div>

        {/* Unrealized PnL - Read Only */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="unrealizedPnl">Unrealized PnL ($)</label>
          <div
            data-testid="unrealized-value"
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: wallet.unrealized !== null ? 'var(--text)' : 'var(--muted)',
              fontSize: '14px'
            }}
          >
            {wallet.unrealized !== null && wallet.unrealized !== undefined ? formatCurrency(wallet.unrealized) : 'Awaiting screenshot…'}
          </div>
        </div>

        {/* Realized Profit - Derived */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="realizedProfit">Realized Profit ($)</label>
          <div
            data-testid="realized-value"
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--text)',
              fontSize: '14px'
            }}
          >
            {wallet.size && wallet.unrealized !== null && wallet.unrealized !== undefined
              ? formatCurrency(wallet.size - state.constants.INVESTOR_SEED_BASELINE - wallet.unrealized)
              : '—'
            }
          </div>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
            Derived: (Wallet - ${state.constants.INVESTOR_SEED_BASELINE.toLocaleString()}) - Unrealized
          </small>
        </div>

        {/* Management Fee % */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="mgmtFee">Management Fee (%)</label>
          <input
            id="mgmtFee"
            type="number"
            min="0"
            max="100"
            step="1"
            value={state.constants.MGMT_FEE_RATE * 100}
            onChange={(e) => updateConstants({ MGMT_FEE_RATE: Number(e.target.value) / 100 })}
          />
        </div>

        {/* Entry Fee % */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="entryFee">Entry Fee (%)</label>
          <input
            id="entryFee"
            type="number"
            min="0"
            max="100"
            step="1"
            value={state.constants.ENTRY_FEE_RATE * 100}
            onChange={(e) => updateConstants({ ENTRY_FEE_RATE: Number(e.target.value) / 100 })}
          />
        </div>

        {/* Founder Moonbag % */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="founderMoonbag">Founder Moonbag (%)</label>
          <input
            id="founderMoonbag"
            type="number"
            min="0"
            max="100"
            step="1"
            value={state.constants.FOUNDERS_MOONBAG_PCT * 100}
            onChange={(e) => updateConstants({ FOUNDERS_MOONBAG_PCT: Number(e.target.value) / 100 })}
          />
        </div>

        {/* Founder Count */}
        <div style={{ gridColumn: 'span 3' }}>
          <label htmlFor="founderCount">Founder Count</label>
          <input
            id="founderCount"
            type="number"
            min="1"
            step="1"
            value={state.constants.FOUNDERS_COUNT}
            onChange={(e) => updateConstants({ FOUNDERS_COUNT: Number(e.target.value) })}
          />
        </div>

      </div>

      {/* Summary Info */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: 'var(--ink)',
        borderRadius: '6px',
        fontSize: '13px',
        color: 'var(--muted)'
      }}>
        <strong>Current Settings:</strong> {formatPercent(state.constants.MGMT_FEE_RATE)} mgmt fee on investor profits •
        {formatPercent(state.constants.ENTRY_FEE_RATE)} entry fee to founders •
        {formatPercent(state.constants.FOUNDERS_MOONBAG_PCT)} of moonbag to founders
      </div>
    </div>
  );
}