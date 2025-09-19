"use client";

import React, { useState } from 'react';
import { INVESTOR_PRESET } from '@/data/presets';
import { useCalculator } from '@/context/CalculatorContext';

interface InvestorRow {
  name: string;
  date: string;
  amount: string;
  rule: string;
  cls?: string;
}

export default function InvestorsTable(): JSX.Element {
  // Seed baseline data from presets
  const [rows, setRows] = useState<InvestorRow[]>(
    INVESTOR_PRESET.map(r => ({ name: r.name, date: r.date, amount: String(r.amount), rule: r.rule || 'net', cls: r.cls || 'investor' })),
  );
  const calc = useCalculator();

  const addRow = () =>
    setRows([...rows, { name: '', date: '', amount: '', rule: 'net' }]);
  const removeRow = (index: number) => {
    setRows(rows.filter((_: InvestorRow, i: number) => i !== index));
  };

  const loadPresets = () => {
    setRows(INVESTOR_PRESET.map(r => ({ name: r.name, date: r.date, amount: String(r.amount), rule: r.rule || 'net', cls: r.cls || 'investor' })));
    // Update realizedProfit in context as example (sum of investor amounts)
    const sum = INVESTOR_PRESET.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    calc.setRealizedProfit(sum);
  };

  const clearRows = () => {
    setRows([]);
  };

  const updateRow = (
    index: number,
    field: keyof InvestorRow,
    value: string,
  ) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  return (
    <div className="panel">
      <h2>Investors & Contributions</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: '14%' }}>Investor</th>
              <th style={{ width: '12%' }}>Class</th>
              <th style={{ width: '18%' }}>Date</th>
              <th style={{ width: '18%' }}>Amount ($)</th>
              <th style={{ width: '18%' }}>Gross→Net rule</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: InvestorRow, idx: number) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(idx, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <select value={row.cls || 'investor'} onChange={e => updateRow(idx, 'cls', e.target.value)}>
                    <option value="founder">founder</option>
                    <option value="investor">investor</option>
                  </select>
                </td>
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
                  <select
                    value={row.rule}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateRow(idx, 'rule', e.target.value)}
                  >
                    <option value="net">Net of fee</option>
                    <option value="gross">Fee outside</option>
                  </select>
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
              <td colSpan={5}>
                <button className="btn" onClick={addRow}>
                  + Add investor
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
      <div className="small" id="presetNote">
        Preset: example investors; fees placeholders.
      </div>
    </div>
  );
}
