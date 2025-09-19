"use client";

import React, { useState, useCallback, type ChangeEvent } from 'react';
import { INVESTOR_PRESET } from '@/data/presets';
import { useCalculator } from '@/context/CalculatorContext';

interface InvestorRow {
  name: string;
  date: string;
  amount: string;
  rule: string;
  cls?: string;
}

export default function InvestorsTable() {
  // Seed baseline data from presets (including founders)
  const [rows, setRows] = useState<InvestorRow[]>([
    // Add founders first
    { name: 'Founders', date: '2025-07-10', amount: '5000', rule: 'net', cls: 'founder' },
    // Then add investors
    ...INVESTOR_PRESET.map(r => ({ name: r.name, date: r.date, amount: String(r.amount), rule: r.rule || 'net', cls: r.cls || 'investor' }))
  ]);
  const calc = useCalculator();

  const addRow = () =>
    setRows([...rows, { name: '', date: '', amount: '', rule: 'net' }]);
  const removeRow = (index: number) => {
    setRows(rows.filter((_: InvestorRow, i: number) => i !== index));
  };

  const loadPresets = () => {
    const combinedData = [
      { name: 'Founders', date: '2025-07-10', amount: '5000', rule: 'net', cls: 'founder' },
      ...INVESTOR_PRESET.map(r => ({ name: r.name, date: r.date, amount: String(r.amount), rule: r.rule || 'net', cls: r.cls || 'investor' }))
    ];
    setRows(combinedData);
    // Update realizedProfit in context as example (sum of investor amounts only)
    const investorSum = INVESTOR_PRESET.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    calc.setRealizedProfit(investorSum);
  };

  const clearRows = () => {
    setRows([]);
  };

  const populateFromAI = useCallback(async (aiData: Array<{ name?: string; date: string; amount: number; rule?: string; cls?: string }>) => {
    const formattedRows = aiData.map((item, index) => ({
      name: item.name || `Investor ${index + 1}`,
      date: item.date,
      amount: String(item.amount),
      rule: item.rule || 'net',
      cls: item.cls || 'investor'
    }));
    setRows(formattedRows);

    // Update realized profit with total
    const sum = aiData.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    calc.setRealizedProfit(sum);
  }, [calc]);

  // Expose functions globally for AI integration and results calculation
  React.useEffect(() => {
    (window as unknown as { populateInvestorsFromAI?: typeof populateFromAI }).populateInvestorsFromAI = populateFromAI;
    (window as unknown as { getInvestorData?: () => InvestorRow[] }).getInvestorData = () => rows;
    return () => {
      delete (window as unknown as { populateInvestorsFromAI?: typeof populateFromAI }).populateInvestorsFromAI;
      delete (window as unknown as { getInvestorData?: () => InvestorRow[] }).getInvestorData;
    };
  }, [populateFromAI, rows]);

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
      <h2>Founders & Investors</h2>
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateRow(idx, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <select value={row.cls || 'investor'} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateRow(idx, 'cls', e.target.value)}>
                    <option value="founder">founder</option>
                    <option value="investor">investor</option>
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    value={row.date}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateRow(idx, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateRow(idx, 'amount', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={row.rule}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateRow(idx, 'rule', e.target.value)}
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
                <button
                  className="btn"
                  onClick={() => {
                    const completeData = [
                      { name: 'Founders', date: '2025-07-10', amount: 5000, rule: 'net', cls: 'founder' },
                      { name: 'Laura', date: '2025-07-22', amount: 5000, rule: 'net', cls: 'investor' },
                      { name: 'Laura', date: '2025-07-31', amount: 5000, rule: 'net', cls: 'investor' },
                      { name: 'Laura', date: '2025-08-25', amount: 2500, rule: 'net', cls: 'investor' },
                      { name: 'Laura', date: '2025-09-06', amount: 2500, rule: 'net', cls: 'investor' },
                      { name: 'Damon', date: '2025-08-02', amount: 5000, rule: 'net', cls: 'investor' }
                    ];
                    populateFromAI(completeData);
                  }}
                  style={{ marginLeft: 8, backgroundColor: '#4CAF50', color: 'white' }}
                >
                  🤖 AI Populate (Complete Data)
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
