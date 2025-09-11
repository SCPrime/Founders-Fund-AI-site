'use client';

import { useCalculator } from '@/context/CalculatorContext';

export default function AllocationSettings() {
  const {
    view,
    setView,
    winStart,
    setWinStart,
    winEnd,
    setWinEnd,
    walletSize,
    setWalletSize,
  } = useCalculator();

  return (
    <div className="panel">
      <h2>Allocation Settings</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(12,1fr)', gap: '12px' }}>
        <div style={{ gridColumn: 'span 3' }}>
          <label>View</label>
          <div>
            <button
              id="viewWeek"
              className={`btn ${view === 'week' ? 'activeBtn' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button
              id="viewMax"
              className={`btn ${view === 'max' ? 'activeBtn' : ''}`}
              onClick={() => setView('max')}
            >
              Max
            </button>
          </div>
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label>Allocation window — Start (inclusive)</label>
          <input
            id="winStart"
            type="date"
            value={winStart}
            onChange={e => setWinStart(e.target.value)}
          />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label>Allocation window — End (inclusive)</label>
          <input
            id="winEnd"
            type="date"
            value={winEnd}
            onChange={e => setWinEnd(e.target.value)}
          />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <label>Total Wallet Size at End of Window ($)</label>
          <input
            id="walletSize"
            type="number"
            step="0.01"
            value={walletSize}
            onChange={e => setWalletSize(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
}
