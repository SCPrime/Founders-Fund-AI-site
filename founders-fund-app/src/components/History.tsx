'use client';

import { useState } from 'react';

export default function History() {
  const [snapshots] = useState<string[]>([]);

  const handleExport = () => {
    console.log('Export history');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Import history', file.name);
    }
  };

  const handleClear = () => {
    console.log('Clear history');
  };

  return (
    <div className="panel">
      <h2>Saved Snapshots</h2>
      <div className="small">
        Snapshots are saved to your browser’s local storage. They include inputs and computed results (for charts).
      </div>
      <div className="small" style={{ marginTop: '10px' }}>
        {snapshots.length === 0 ? (
          <p className="muted">No snapshots yet</p>
        ) : (
          snapshots.map((s, i) => <div key={i}>{s}</div>)
        )}
      </div>
      <div className="hr"></div>
      <div>
        <button className="btn" onClick={handleExport}>
          Export history
        </button>
        <input
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          id="histFile"
          onChange={handleImport}
        />
        <button className="btn" onClick={() => document.getElementById('histFile')?.click()}>
          Import history
        </button>
        <button className="btn" onClick={handleClear}>
          Clear history
        </button>
      </div>
    </div>
  );
}
