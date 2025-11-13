'use client';

import React, { useCallback } from 'react';
import { useAllocationStore } from '@/store/allocationStore';

export default function FoundersTable() {
  const {
    state,
    addContribution,
    updateContribution,
    removeContribution
  } = useAllocationStore();

  // Get founders contributions from store
  const foundersContributions = state.contributions.filter(c =>
    c.owner === 'founders' && c.type !== 'founders_entry_fee'
  );

  const addRow = () => {
    addContribution({
      owner: 'founders',
      name: 'Founder',
      type: 'seed',
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

    // Convert date field to ts
    if (field === 'date') {
      updates.ts = value;
    }

    updateContribution(id, updates);
  };

  const loadPresets = () => {
    // Clear existing founders contributions first
    const currentFoundersContributions = state.contributions.filter(c =>
      c.owner === 'founders' && c.type !== 'founders_entry_fee'
    );
    currentFoundersContributions.forEach(contrib => removeContribution(contrib.id));

    // Add preset data
    const FOUNDER_PRESET = [
      { date: '2025-07-10', amount: 5000 }
    ];

    FOUNDER_PRESET.forEach(preset => {
      addContribution({
        owner: 'founders',
        name: 'Founder',
        type: 'seed',
        amount: preset.amount,
        ts: preset.date,
        earnsDollarDaysThisWindow: true
      });
    });
  };

  const clearRows = () => {
    const currentFoundersContributions = state.contributions.filter(c =>
      c.owner === 'founders' && c.type !== 'founders_entry_fee'
    );
    currentFoundersContributions.forEach(contrib => removeContribution(contrib.id));
  };

  const populateFromAI = useCallback(async (aiData: Array<{ date: string; amount: number }>) => {
    // Clear existing founders contributions
    const currentFoundersContributions = state.contributions.filter(c =>
      c.owner === 'founders' && c.type !== 'founders_entry_fee'
    );
    currentFoundersContributions.forEach(contrib => removeContribution(contrib.id));

    // Add AI data
    aiData.forEach(item => {
      addContribution({
        owner: 'founders',
        name: 'Founder',
        type: 'seed',
        amount: item.amount,
        ts: item.date,
        earnsDollarDaysThisWindow: true
      });
    });
  }, [state.contributions, addContribution, removeContribution]);

  // Expose function globally for AI integration
  React.useEffect(() => {
    (window as unknown as { populateFoundersFromAI?: typeof populateFromAI }).populateFoundersFromAI = populateFromAI;
    return () => {
      delete (window as unknown as { populateFoundersFromAI?: typeof populateFromAI }).populateFoundersFromAI;
    };
  }, [populateFromAI]);

  return (
    <div className="panel" style={{ marginTop: '16px' }}>
      <h2>Founders Contributions</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Date</th>
              <th style={{ width: '35%' }}>Amount ($)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {foundersContributions.map((contribution) => (
              <tr key={contribution.id}>
                <td>
                  <input
                    type="date"
                    value={contribution.ts}
                    onChange={(e) => updateRow(contribution.id, 'date', e.target.value)}
                    aria-label="Contribution date"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={contribution.amount}
                    onChange={(e) => updateRow(contribution.id, 'amount', Number(e.target.value))}
                    aria-label="Contribution amount in dollars"
                  />
                </td>
                <td>
                  <span className="x" onClick={() => removeRow(contribution.id)}>
                    Remove
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>
                <button className="btn" onClick={addRow}>
                  + Add founder contribution
                </button>
                <button className="btn" onClick={loadPresets} style={{ marginLeft: 8 }}>
                  Load baseline
                </button>
                <button className="btn" onClick={clearRows} style={{ marginLeft: 8 }}>
                  Clear
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    const founderData = [
                      { date: '2025-07-10', amount: 5000 } // Correct founder seed date and amount
                    ];
                    populateFromAI(founderData);
                  }}
                  style={{ marginLeft: 8, backgroundColor: '#4CAF50', color: 'white' }}
                >
                  🤖 AI Populate (Founder Seed)
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="small">
        Investors’ entry & regular fund fees route to Founders. In <b>Max</b>, accumulated prior fees are added to founders’ capital (local only).
      </div>
    </div>
  );
}
