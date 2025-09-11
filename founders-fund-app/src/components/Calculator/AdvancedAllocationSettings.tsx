'use client';

import { useCalculator } from '@/context/CalculatorContext';

export default function AdvancedAllocationSettings() {
  const {
    realizedProfit,
    setRealizedProfit,
    moonbagReal,
    setMoonbagReal,
    moonbagUnreal,
    setMoonbagUnreal,
    includeUnreal,
    setIncludeUnreal,
    moonbagFounderPct,
    setMoonbagFounderPct,
    mgmtFeePct,
    setMgmtFeePct,
    entryFeePct,
    setEntryFeePct,
    feeReducesInvestor,
    setFeeReducesInvestor,
    founderCount,
    setFounderCount,
    drawPerFounder,
    setDrawPerFounder,
    applyDraws,
    setApplyDraws,
    domLeadPct,
    setDomLeadPct,
  } = useCalculator();

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(12,1fr)', gap: '12px', marginTop: '16px' }}
    >
      <div style={{ gridColumn: 'span 3' }}>
        <label>Realized profit this period (if wallet size = 0) ($)</label>
        <input
          type="number"
          step="0.01"
          value={realizedProfit}
          onChange={e => setRealizedProfit(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>
          Moonbag <b>realized</b> this period ($)
        </label>
        <input
          type="number"
          step="0.01"
          value={moonbagReal}
          onChange={e => setMoonbagReal(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>
          Moonbag <b>unrealized</b> (valuation change) ($)
        </label>
        <input
          type="number"
          step="0.01"
          value={moonbagUnreal}
          onChange={e => setMoonbagUnreal(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Include <b>unrealized</b> in Wallet identity?</label>
        <select
          value={includeUnreal}
          onChange={e => setIncludeUnreal(e.target.value as 'yes' | 'no')}
        >
          <option value="no">No — track only</option>
          <option value="yes">Yes — include in identity</option>
        </select>
      </div>

      <div style={{ gridColumn: 'span 3' }}>
        <label>Moonbag founders share (%)</label>
        <input
          type="number"
          step="0.1"
          value={moonbagFounderPct}
          onChange={e => setMoonbagFounderPct(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Regular fund fee on investor base profit (%) → Founders</label>
        <input
          type="number"
          step="0.1"
          value={mgmtFeePct}
          onChange={e => setMgmtFeePct(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Entry fee on new investor capital (%) → Founders</label>
        <input
          type="number"
          step="0.1"
          value={entryFeePct}
          onChange={e => setEntryFeePct(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Entry fee reduces investor credited capital?</label>
        <select
          value={feeReducesInvestor}
          onChange={e => setFeeReducesInvestor(e.target.value as 'yes' | 'no')}
        >
          <option value="yes">Yes (net = gross × (1−fee))</option>
          <option value="no">No (investor credited full; fee outside)</option>
        </select>
      </div>

      <div style={{ gridColumn: 'span 2' }}>
        <label>Founders — count</label>
        <input
          type="number"
          min="1"
          step="1"
          value={founderCount}
          onChange={e => setFounderCount(parseInt(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label>Weekly draw per founder ($)</label>
        <input
          type="number"
          step="1"
          value={drawPerFounder}
          onChange={e => setDrawPerFounder(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Apply founders’ draws in this period?</label>
        <select
          value={applyDraws}
          onChange={e => setApplyDraws(e.target.value as 'yes' | 'no')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Dominance lead margin (%) over largest investor</label>
        <input
          type="number"
          step="0.1"
          value={domLeadPct}
          onChange={e => setDomLeadPct(parseFloat(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}
