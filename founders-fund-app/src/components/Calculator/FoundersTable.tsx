'use client';

import React, { useState } from 'react';
import { FOUNDER_PRESET } from '@/data/presets';
import { useCalculator } from '@/context/CalculatorContext';

interface FounderRow {
  date: string;
  amount: string;
}

export default function FoundersTable(): JSX.Element {
  // Seed with preset baseline contributions
  const [rows, setRows] = useState<FounderRow[]>(FOUNDER_PRESET.map(r => ({ date: r.date, amount: String(r.amount) })));
  const calc = useCalculator();

  const addRow = () => setRows([...rows, { date: '', amount: '' }]);
  const removeRow = (index: number) => {
    setRows(rows.filter((_: FounderRow, i: number) => i !== index));
  };

  const loadPresets = () => {
    setRows(FOUNDER_PRESET.map(r => ({ date: r.date, amount: String(r.amount) })));
    const sum = FOUNDER_PRESET.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    calc.setWalletSize(sum);
  };

  const clearRows = () => {
    setRows([]);
  };

  const updateRow = (index: number, field: keyof FounderRow, value: string) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

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
            {rows.map((row: FounderRow, idx: number) => (
              <tr key={idx}>
                <td>
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'amount', e.target.value)}
                  />
                </td>
                <td>
                  <span className="x" onClick={() => removeRow(idx)}>
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
