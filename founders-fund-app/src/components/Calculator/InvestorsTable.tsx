'use client';

import { useState } from 'react';

interface InvestorRow {
  name: string;
  date: string;
  amount: string;
  rule: string;
}

export default function InvestorsTable() {
  const [rows, setRows] = useState<InvestorRow[]>([
    { name: '', date: '', amount: '', rule: 'net' },
  ]);

  const addRow = () =>
    setRows([...rows, { name: '', date: '', amount: '', rule: 'net' }]);
  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
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
              <th style={{ width: '18%' }}>Date</th>
              <th style={{ width: '18%' }}>Amount ($)</th>
              <th style={{ width: '18%' }}>Gross→Net rule</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={row.name}
                    onChange={e => updateRow(idx, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={row.date}
                    onChange={e => updateRow(idx, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount}
                    onChange={e => updateRow(idx, 'amount', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={row.rule}
                    onChange={e => updateRow(idx, 'rule', e.target.value)}
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
