'use client';

import { useEffect, useState } from 'react';

interface AnalysisEntry {
  id: string;
  createdAt: string;
  analysis: unknown;
}

export default function History() {
  const [snapshots, setSnapshots] = useState<AnalysisEntry[]>([]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/save-analysis');
        if (!res.ok) throw new Error('Failed to load history');
        const data: AnalysisEntry[] = await res.json();
        setSnapshots(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadHistory();
  }, []);

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
        Saved analyses are fetched from the server and include inputs and results.
      </div>
      <div className="small" style={{ marginTop: '10px' }}>
        {snapshots.length === 0 ? (
          <p className="muted">No snapshots yet</p>
        ) : (
          snapshots.map((s) => (
            <div key={s.id} style={{ marginBottom: '10px' }}>
              <div>{new Date(s.createdAt).toLocaleString()}</div>
              <pre>{JSON.stringify(s.analysis)}</pre>
            </div>
          ))
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
