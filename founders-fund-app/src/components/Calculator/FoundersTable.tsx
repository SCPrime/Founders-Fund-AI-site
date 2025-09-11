'use client';

import { useState } from 'react';

interface FounderRow {
  date: string;
  amount: string;
}

export default function FoundersTable() {
  const [rows, setRows] = useState<FounderRow[]>([{ date: '', amount: '' }]);

  const addRow = () => setRows([...rows, { date: '', amount: '' }]);
  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
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
            {rows.map((row, idx) => (
              <tr key={idx}>
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
