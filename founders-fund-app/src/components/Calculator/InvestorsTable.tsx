"use client";

import React, { useCallback } from 'react';
import { useAllocationStore } from '@/store/allocationStore';

export default function InvestorsTable() {
  const {
    state,
    addContribution,
    updateContribution,
    removeContribution,
    clearContributions,
    validationErrors
  } = useAllocationStore();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const addRow = () => {
    addContribution({
      owner: 'investor',
      name: '',
      type: 'investor_contribution',
      amount: 0,
      ts: new Date().toISOString().split('T')[0],
      earnsDollarDaysThisWindow: true
    });
  };

  const removeRow = (id: string) => {
    removeContribution(id);
  };

  const updateRow = (id: string, field: string, value: string | number) => {
    const updates: Record<string, unknown> = { [field]: value };

    // Convert owner/type based on legacy field mappings
    if (field === 'cls') {
      updates.owner = value === 'founder' ? 'founders' : 'investor';
      updates.type = value === 'founder' ? 'seed' : 'investor_contribution';
    }
    if (field === 'date') {
      updates.ts = value;
    }

    updateContribution(id, updates);
  };

  const populateDemo = useCallback(() => {
    // This is handled by the bootstrap now, but kept for legacy compatibility
    console.log('Demo data is now loaded automatically on startup');
  }, []);

  // Group contributions by type for display - exclude entry fee legs from main table
  const foundersContributions = state.contributions.filter(c =>
    c.owner === 'founders' && c.type !== 'founders_entry_fee'
  );
  const investorContributions = state.contributions.filter(c => c.owner === 'investor');

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2>👥 Founders & Investors</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={addRow}>
            + Add Investor
          </button>
          <button className="btn secondary" onClick={clearContributions}>
            Clear All
          </button>
          <button className="btn secondary" onClick={populateDemo}>
            Demo Data (Auto-loaded)
          </button>
        </div>
      </div>

      {/* Validation Issues */}
      {validationErrors.length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid var(--bad)',
          borderRadius: '6px'
        }}>
          <strong style={{ color: 'var(--bad)' }}>⚠️ Issues ({validationErrors.length}):</strong>
          {validationErrors.slice(0, 3).map((issue, idx) => (
            <div key={idx} style={{ fontSize: '13px', color: 'var(--bad)', marginTop: '4px' }}>
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {/* Contributions Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th>Date</th>
              <th>Amount ($)</th>
              <th>Net Rule</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Founders Rows */}
            {foundersContributions.map((contrib, index) => {
              const getTestId = (name: string, idx: number) => {
                const baseTestId = `row-${name}`;
                const existingWithSameName = foundersContributions
                  .slice(0, idx)
                  .filter(c => c.name === name).length;
                return existingWithSameName > 0 ? `${baseTestId}-${existingWithSameName}` : baseTestId;
              };

              return (
                <tr key={contrib.id} data-testid={getTestId(contrib.name, index)}>
                  <td>
                    <input
                      type="text"
                      value={contrib.name}
                      onChange={(e) => updateRow(contrib.id, 'name', e.target.value)}
                      placeholder="Enter name"
                      style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
                    />
                  </td>
                  <td>
                    <select
                      value="founder"
                      disabled
                      style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
                    >
                      <option value="founder">Founder</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={contrib.ts}
                      onChange={(e) => updateRow(contrib.id, 'date', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="100"
                      value={contrib.amount}
                      onChange={(e) => updateRow(contrib.id, 'amount', Number(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <select
                      value="gross"
                      disabled
                      style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}
                    >
                      <option value="gross">Gross</option>
                    </select>
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                      No entry fee on founders
                    </small>
                  </td>
                  <td>
                    <button
                      onClick={() => removeRow(contrib.id)}
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
                  </td>
                </tr>
              );
            })}

            {/* Investor Rows */}
            {investorContributions.map((contrib, index) => {
              const getTestId = (name: string, idx: number) => {
                const baseTestId = `row-${name}`;
                const existingWithSameName = investorContributions
                  .slice(0, idx)
                  .filter(c => c.name === name).length;
                return existingWithSameName > 0 ? `${baseTestId}-${existingWithSameName}` : baseTestId;
              };

              return (
                <tr key={contrib.id} data-testid={getTestId(contrib.name, index)}>
                  <td>
                    <input
                      type="text"
                      value={contrib.name}
                      onChange={(e) => updateRow(contrib.id, 'name', e.target.value)}
                      placeholder="Enter name"
                    />
                  </td>
                  <td>
                    <select
                      value="investor"
                      onChange={(e) => updateRow(contrib.id, 'cls', e.target.value)}
                    >
                      <option value="investor">Investor</option>
                      <option value="founder">Founder</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={contrib.ts}
                      onChange={(e) => updateRow(contrib.id, 'date', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="100"
                      value={contrib.amount}
                      onChange={(e) => updateRow(contrib.id, 'amount', Number(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <select value="net-of-fee" disabled>
                      <option value="net-of-fee">Net of fee</option>
                    </select>
                    <small style={{ display: 'block', color: 'var(--muted)', fontSize: '11px' }}>
                      {state.constants.ENTRY_FEE_RATE * 100}% entry fee to founders
                    </small>
                  </td>
                  <td>
                    <button
                      onClick={() => removeRow(contrib.id)}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: 'var(--ink)',
        borderRadius: '6px',
        fontSize: '13px',
        color: 'var(--muted)'
      }}>
        <strong>Summary:</strong> {foundersContributions.length} founder entries, {investorContributions.length} investor entries •
        Total gross: {formatCurrency(state.contributions.reduce((sum, c) => sum + c.amount, 0))} •
        Net credited: {formatCurrency(state.contributions.filter(c => c.earnsDollarDaysThisWindow).reduce((sum, c) => sum + c.amount, 0))}
      </div>
    </div>
  );
}