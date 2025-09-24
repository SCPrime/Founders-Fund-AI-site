'use client';

import { useFundStore } from '@/store/fundStore';

export default function AdvancedAllocationSettings() {
  const { settings, updateSettings } = useFundStore();

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
          value={settings.realizedProfit}
          onChange={e => updateSettings({ realizedProfit: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>
          Moonbag <b>realized</b> this period ($)
        </label>
        <input
          type="number"
          step="0.01"
          value={settings.moonbagReal}
          onChange={e => updateSettings({ moonbagReal: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>
          Moonbag <b>unrealized</b> (valuation change) ($)
        </label>
        <input
          type="number"
          step="0.01"
          value={settings.moonbagUnreal}
          onChange={e => updateSettings({ moonbagUnreal: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Include <b>unrealized</b> in Wallet identity?</label>
        <select
          value={settings.includeUnreal}
          onChange={e => updateSettings({ includeUnreal: e.target.value as 'yes' | 'no' })}
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
          value={settings.moonbagFounderPct}
          onChange={e => updateSettings({ moonbagFounderPct: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Regular fund fee on investor base profit (%) → Founders</label>
        <input
          type="number"
          step="0.1"
          value={settings.mgmtFeePct}
          onChange={e => updateSettings({ mgmtFeePct: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Entry fee on new investor capital (%) → Founders</label>
        <input
          type="number"
          step="0.1"
          value={settings.entryFeePct}
          onChange={e => updateSettings({ entryFeePct: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Entry fee reduces investor credited capital?</label>
        <select
          value={settings.feeReducesInvestor}
          onChange={e => updateSettings({ feeReducesInvestor: e.target.value as 'yes' | 'no' })}
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
          value={settings.founderCount}
          onChange={e => updateSettings({ founderCount: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label>Weekly draw per founder ($)</label>
        <input
          type="number"
          step="1"
          value={settings.drawPerFounder}
          onChange={e => updateSettings({ drawPerFounder: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div style={{ gridColumn: 'span 3' }}>
        <label>Apply founders’ draws in this period?</label>
        <select
          value={settings.applyDraws}
          onChange={e => updateSettings({ applyDraws: e.target.value as 'yes' | 'no' })}
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
          value={settings.domLeadPct}
          onChange={e => updateSettings({ domLeadPct: parseFloat(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}
