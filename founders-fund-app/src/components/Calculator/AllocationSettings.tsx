'use client';

import { useState } from 'react';
import { useAllocationStore } from '@/store/allocationStore';

export default function AllocationSettings() {
  const { state, wallet, snapshots, updateWindow, updateConstants, advanceWindow } = useAllocationStore();
  const [uploading, setUploading] = useState(false);

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

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // Prepare form data
  const formData = new FormData();
  formData.append('image', file);
  try {
    // Optionally, set a loading state here to show spinner
    setUploading(true);
    const res = await fetch('/api/ocr', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      throw new Error(`OCR request failed: ${res.status}`);
    }
    const data = await res.json();
    if (data.error) {
      console.error('OCR API error:', data.error);
      alert('Failed to extract data from image. Please try again or enter manually.');
      return;
    }
    const { walletSize, unrealized } = data;
    // Update the Zustand store with these values
    useAllocationStore.getState().saveScreenshot({
      imageId: file.name + '_' + Date.now(),  // generate an ID for this screenshot
      walletSize: walletSize,
      unrealized: unrealized,
      capturedAt: new Date().toISOString()
    });
    // The saveScreenshot action will update state.walletSizeEndOfWindow and unrealizedPnlEndOfWindow, and trigger recompute
    console.log(`OCR extracted wallet=${walletSize}, unrealized=${unrealized}`);
  } catch (err) {
    console.error('Upload failed:', err);
    alert('Image upload or processing failed. Please check console for details.');
  } finally {
    setUploading(false);
  }
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

        {/* OCR Upload Section */}
        <div style={{ gridColumn: 'span 6' }}>
          <div className="ocr-upload-section">
            <label htmlFor="screenshotUpload" style={{ marginRight: '8px' }}>
              Upload Screenshot:
            </label>
            <input
              id="screenshotUpload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'inline-block' }}
              disabled={uploading}
            />
            {uploading && <p>Extracting data from image...</p>}
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

      {/* Window Management */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong>Period Management:</strong>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} saved
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
          Current window: {new Date(state.window.start).toLocaleDateString()} - {new Date(state.window.end).toLocaleDateString()}
        </div>
        <button
          onClick={() => {
            if (snapshots.length === 0) {
              alert('Please save a snapshot before advancing to the next window. Use "Save snapshot now" button above.');
              return;
            }
            if (confirm('Advance to next period? This will:\n- Start a new window period\n- Update baseline capital from last snapshot\n- Mark current contributions as prior capital\n- Reset calculations for the new period')) {
              advanceWindow();
            }
          }}
          disabled={snapshots.length === 0}
          style={{
            padding: '8px 16px',
            backgroundColor: snapshots.length > 0 ? 'var(--accent)' : 'var(--muted)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: snapshots.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          🚀 Advance to Next Period
        </button>
        {snapshots.length === 0 && (
          <div style={{ fontSize: '11px', color: 'var(--error)', marginTop: '4px' }}>
            Save a snapshot first to enable period advancement
          </div>
        )}
      </div>
    </div>
  );
}