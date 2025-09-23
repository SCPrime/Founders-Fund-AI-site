'use client';

import React, { useState } from 'react';
import { useAllocationStore, allocationSelectors } from '@/store/allocationStore';

export default function AllocationDashboard() {
  const {
    state,
    outputs,
    validationErrors,
    isComputing,
    lastComputeTime,
    wallet,
    updateWindow,
    addContribution,
    removeContribution,
    saveSnapshot,
    reset,
    recompute
  } = useAllocationStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_DEBUG === '1';
  const [newContribution, setNewContribution] = useState<{
    name: string;
    amount: string;
    date: string;
    type: 'investor_contribution' | 'seed';
    owner: 'investor' | 'founders';
  }>({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'investor_contribution',
    owner: 'investor'
  });

  const allocationSummary = allocationSelectors.getAllocationSummary();

  const handleAddContribution = () => {
    if (!newContribution.name || !newContribution.amount) return;

    addContribution({
      owner: newContribution.owner,
      name: newContribution.name,
      type: newContribution.type,
      amount: Number(newContribution.amount),
      ts: newContribution.date,
      earnsDollarDaysThisWindow: true
    });

    setNewContribution({
      name: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'investor_contribution',
      owner: 'investor'
    });
  };

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
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2>⚖️ Founders Fund Allocation Engine</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isComputing && (
            <span style={{ color: 'var(--warn)', fontSize: '14px' }}>⏳ Computing...</span>
          )}
          {lastComputeTime && (
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
              Last: {new Date(lastComputeTime).toLocaleTimeString()}
            </span>
          )}
          <button className="btn" onClick={recompute} disabled={isComputing}>
            🔄 Recompute
          </button>
          <button className="btn" onClick={saveSnapshot} disabled={!outputs}>
            📸 Save Snapshot
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid var(--bad)',
          borderRadius: '6px'
        }}>
          <h4 style={{ color: 'var(--bad)', margin: '0 0 12px 0' }}>
            ⚠️ Validation Issues ({validationErrors.length})
          </h4>
          {validationErrors.map((error, idx) => (
            <div key={idx} style={{
              fontSize: '13px',
              color: error.type === 'error' ? 'var(--bad)' : 'var(--warn)',
              marginBottom: '8px'
            }}>
              <strong>{error.field}:</strong> {error.message}
            </div>
          ))}
        </div>
      )}

      {/* Core Settings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: 'var(--ink)',
        borderRadius: '6px'
      }}>
        <div>
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

        <div>
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

        <div>
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
              ? formatCurrency(wallet.size - 20000 - wallet.unrealized)
              : '—'
            }
          </div>
          <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
            Derived: (Wallet - $20,000) - Unrealized
          </small>
        </div>

        <div>
          <label htmlFor="windowStart">Window Start</label>
          <input
            id="windowStart"
            type="date"
            value={state.window.start}
            onChange={(e) => updateWindow({ ...state.window, start: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="windowEnd">Window End</label>
          <input
            id="windowEnd"
            type="date"
            value={state.window.end}
            onChange={(e) => updateWindow({ ...state.window, end: e.target.value })}
          />
        </div>
      </div>

      {/* Summary Cards */}
      {outputs && allocationSummary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--panel)',
            borderRadius: '6px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Total Profit</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>
              {formatCurrency(allocationSummary.totalProfit)}
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'var(--panel)',
            borderRadius: '6px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Realized Profit</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--good)' }}>
              {formatCurrency(allocationSummary.realizedProfit)}
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'var(--panel)',
            borderRadius: '6px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Founders Share</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text)' }}>
              {formatPercent(allocationSummary.foundersShare)}
            </div>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'var(--panel)',
            borderRadius: '6px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>Mgmt Fees Total</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--warn)' }}>
              {formatCurrency(allocationSummary.totalMgmtFees)}
            </div>
          </div>
        </div>
      )}

      {/* Simple Allocation Summary */}
      {outputs && (
        <div style={{ marginBottom: '24px' }}>
          <h3>Allocation Summary</h3>
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--panel)',
            borderRadius: '6px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <strong>Profit Total:</strong> {formatCurrency(outputs.profitTotal)}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Realized Profit:</strong> {formatCurrency(outputs.realizedProfit)}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Founders Share:</strong> {formatPercent(outputs.shares.founders)}
              ({formatCurrency(outputs.realizedNet.founders)} net)
            </div>
            <div style={{ marginBottom: '12px' }}>
              <strong>Management Fees:</strong> {formatCurrency(outputs.managementFees.foundersCarryTotal)}
            </div>
            <div>
              <strong>Moonbag (Founders):</strong> {formatCurrency(outputs.moonbag.founders)}
            </div>
          </div>
        </div>
      )}

      {/* Simple Contributions List */}
      <div style={{ marginBottom: '24px' }}>
        <h3>Contributions</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto auto auto auto',
          gap: '12px',
          alignItems: 'end',
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: 'var(--ink)',
          borderRadius: '6px'
        }}>
          <div>
            <label>Name</label>
            <input
              type="text"
              value={newContribution.name}
              onChange={(e) => setNewContribution(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter name"
            />
          </div>
          <div>
            <label>Amount ($)</label>
            <input
              type="number"
              step="100"
              value={newContribution.amount}
              onChange={(e) => setNewContribution(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div>
            <label>Date</label>
            <input
              type="date"
              value={newContribution.date}
              onChange={(e) => setNewContribution(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div>
            <label>Type</label>
            <select
              value={newContribution.type}
              onChange={(e) => setNewContribution(prev => ({
                ...prev,
                type: e.target.value as 'investor_contribution' | 'seed',
                owner: e.target.value === 'investor_contribution' ? 'investor' : 'founders'
              }))}
            >
              <option value="investor_contribution">Investor</option>
              <option value="seed">Founders</option>
            </select>
          </div>
          <button
            className="btn"
            onClick={handleAddContribution}
            disabled={!newContribution.name || !newContribution.amount}
          >
            + Add
          </button>
        </div>

        <div style={{ fontSize: '14px', marginBottom: '16px' }}>
          <strong>Current Contributions:</strong>
        </div>

        {state.contributions.map((contrib, index) => {
          // Generate test ID based on contribution name and index for multiple entries
          const getTestId = (name: string, idx: number) => {
            const baseTestId = `row-${name}`;
            const existingWithSameName = state.contributions
              .slice(0, idx)
              .filter(c => c.name === name).length;
            return existingWithSameName > 0 ? `${baseTestId}-${existingWithSameName}` : baseTestId;
          };

          return (
          <div
            key={contrib.id}
            data-testid={getTestId(contrib.name, index)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              marginBottom: '8px',
              backgroundColor: contrib.owner === 'founders' ? 'rgba(255, 193, 7, 0.1)' : 'var(--panel)',
              borderRadius: '4px',
              border: '1px solid var(--line)'
            }}
          >
            <span>
              <strong>{contrib.name}</strong> - {formatCurrency(contrib.amount)} on {contrib.ts}
            </span>
            <button
              onClick={() => removeContribution(contrib.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--bad)',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove
            </button>
          </div>
          );
        })}
      </div>

      {/* Advanced Debug */}
      {SHOW_DEBUG && (
        <div style={{ marginBottom: '24px' }}>
          <button
            className="btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ marginBottom: '16px' }}
          >
            {showAdvanced ? '▼' : '▶'} Advanced Debug
          </button>

          {showAdvanced && outputs && (
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--ink)',
            borderRadius: '6px',
            border: '1px solid var(--line)'
          }}>
            <h4>Debug Information</h4>
            <div style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              backgroundColor: 'var(--panel)',
              padding: '12px',
              borderRadius: '4px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              <div><strong>Dollar-Days Total:</strong> {outputs.dollarDays.total}</div>
              <div><strong>Founders Dollar-Days:</strong> {outputs.dollarDays.founders}</div>
              <div><strong>Validation Errors:</strong> {validationErrors.length}</div>
              <div><strong>Expanded Legs:</strong> {outputs.expandedLegs.length}</div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                className="btn"
                onClick={reset}
                style={{ backgroundColor: 'var(--bad)', color: 'white' }}
              >
                🔄 Reset All Data
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      <div className="small" style={{ color: 'var(--muted)' }}>
        💡 <strong>Authoritative Algorithm:</strong> Implements the complete Founders Fund allocation spec
        with dollar-days calculation, time-weighted shares, management fees, and moonbag distribution.
      </div>
    </div>
  );
}