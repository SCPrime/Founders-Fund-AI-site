'use client';

import React, { useState } from 'react';
import { useFundStore } from '@/store/fundStore';

interface SnapshotData {
  timestamp: string;
  settings: {
    view: string;
    winStart: string;
    winEnd: string;
    walletSize: number;
    realizedProfit: number;
    moonbagReal: number;
    moonbagUnreal: number;
    includeUnreal: string;
    moonbagFounderPct: number;
    mgmtFeePct: number;
    entryFeePct: number;
    feeReducesInvestor: string;
    founderCount: number;
    drawPerFounder: number;
    applyDraws: string;
    domLeadPct: number;
  };
  // Note: In the real implementation, you'd also export founders/investors data
  // For now, we'll focus on the settings export
}

export default function ExportImport() {
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [importData, setImportData] = useState('');
  const [message, setMessage] = useState('');
  const { settings, updateSettings } = useFundStore();

  const createSnapshot = () => {
    const snapshot: SnapshotData = {
      timestamp: new Date().toISOString(),
      settings: {
        view: settings.view,
        winStart: settings.winStart,
        winEnd: settings.winEnd,
        walletSize: settings.walletSize,
        realizedProfit: settings.realizedProfit,
        moonbagReal: settings.moonbagReal,
        moonbagUnreal: settings.moonbagUnreal,
        includeUnreal: settings.includeUnreal,
        moonbagFounderPct: settings.moonbagFounderPct,
        mgmtFeePct: settings.mgmtFeePct,
        entryFeePct: settings.entryFeePct,
        feeReducesInvestor: settings.feeReducesInvestor,
        founderCount: settings.founderCount,
        drawPerFounder: settings.drawPerFounder,
        applyDraws: settings.applyDraws,
        domLeadPct: settings.domLeadPct,
      }
    };

    const newSnapshots = [...snapshots, snapshot];
    setSnapshots(newSnapshots);

    // Save to localStorage
    localStorage.setItem('foundersFundSnapshots', JSON.stringify(newSnapshots));

    setMessage(`✅ Snapshot created at ${new Date(snapshot.timestamp).toLocaleString()}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const loadSnapshot = (snapshot: SnapshotData) => {
    const s = snapshot.settings;
    updateSettings({
      view: s.view as 'week' | 'max',
      winStart: s.winStart,
      winEnd: s.winEnd,
      walletSize: s.walletSize,
      realizedProfit: s.realizedProfit,
      moonbagReal: s.moonbagReal,
      moonbagUnreal: s.moonbagUnreal,
      includeUnreal: s.includeUnreal as 'yes' | 'no',
      moonbagFounderPct: s.moonbagFounderPct,
      mgmtFeePct: s.mgmtFeePct,
      entryFeePct: s.entryFeePct,
      feeReducesInvestor: s.feeReducesInvestor as 'yes' | 'no',
      founderCount: s.founderCount,
      drawPerFounder: s.drawPerFounder,
      applyDraws: s.applyDraws as 'yes' | 'no',
      domLeadPct: s.domLeadPct,
    });

    setMessage(`✅ Loaded snapshot from ${new Date(snapshot.timestamp).toLocaleString()}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const deleteSnapshot = (index: number) => {
    const newSnapshots = snapshots.filter((_, i) => i !== index);
    setSnapshots(newSnapshots);
    localStorage.setItem('foundersFundSnapshots', JSON.stringify(newSnapshots));
    setMessage('✅ Snapshot deleted');
    setTimeout(() => setMessage(''), 3000);
  };

  const exportToJSON = () => {
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      snapshots: snapshots
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `founders-fund-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setMessage('✅ Data exported to JSON file');
    setTimeout(() => setMessage(''), 3000);
  };

  const importFromJSON = () => {
    try {
      const data = JSON.parse(importData);
      if (data.snapshots && Array.isArray(data.snapshots)) {
        setSnapshots(data.snapshots);
        localStorage.setItem('foundersFundSnapshots', JSON.stringify(data.snapshots));
        setMessage(`✅ Imported ${data.snapshots.length} snapshots`);
        setImportData('');
      } else {
        setMessage('❌ Invalid JSON format');
      }
    } catch {
      setMessage('❌ Error parsing JSON');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const generatePDF = async () => {
    try {
      // Dynamic import to avoid build issues
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text('Founders Fund Calculator Report', 20, 20);

      // Current settings
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);

      // Settings table
      const settingsData = [
        ['View Mode', settings.view],
        ['Window Start', settings.winStart || 'Not set'],
        ['Window End', settings.winEnd || 'Not set'],
        ['Total Wallet Size', `$${settings.walletSize.toLocaleString()}`],
        ['Realized Profit', `$${settings.realizedProfit.toLocaleString()}`],
        ['Moonbag Real', `$${settings.moonbagReal.toLocaleString()}`],
        ['Moonbag Unrealized', `$${settings.moonbagUnreal.toLocaleString()}`],
        ['Management Fee', `${settings.mgmtFeePct}%`],
        ['Entry Fee', `${settings.entryFeePct}%`],
        ['Founder Count', settings.founderCount.toString()],
      ];

      autoTable(doc, {
        head: [['Setting', 'Value']],
        body: settingsData,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
      });

      doc.save(`founders-fund-report-${new Date().toISOString().split('T')[0]}.pdf`);
      setMessage('✅ PDF report generated');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Error generating PDF');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Load snapshots from localStorage on component mount
  React.useEffect(() => {
    const saved = localStorage.getItem('foundersFundSnapshots');
    if (saved) {
      try {
        setSnapshots(JSON.parse(saved));
      } catch {
        console.warn('Failed to load snapshots from localStorage');
      }
    }
  }, []);

  return (
    <div className="panel">
      <h2>📦 Export & Import</h2>

      {message && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: message.includes('❌') ? '#ffebee' : '#e8f5e8',
          color: message.includes('❌') ? '#c62828' : '#2e7d32',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

        {/* Snapshots Section */}
        <div>
          <h3>📸 Snapshots</h3>
          <button onClick={createSnapshot} className="btn" style={{ marginBottom: '12px', backgroundColor: '#4CAF50', color: 'white' }}>
            Create Snapshot
          </button>

          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            {snapshots.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
                No snapshots yet. Create one to save current state.
              </div>
            ) : (
              snapshots.map((snapshot, index) => (
                <div key={index} style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {new Date(snapshot.timestamp).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Wallet: ${snapshot.settings.walletSize.toLocaleString()} |
                      Fees: {snapshot.settings.mgmtFeePct}%/{snapshot.settings.entryFeePct}%
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => loadSnapshot(snapshot)}
                      style={{ marginRight: '4px', padding: '2px 6px', fontSize: '11px' }}
                      className="btn"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteSnapshot(index)}
                      style={{ padding: '2px 6px', fontSize: '11px', backgroundColor: '#f44336', color: 'white' }}
                      className="btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Export Section */}
        <div>
          <h3>📤 Export</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={exportToJSON} className="btn" style={{ backgroundColor: '#2196F3', color: 'white' }}>
              💾 Export to JSON
            </button>
            <button onClick={generatePDF} className="btn" style={{ backgroundColor: '#FF9800', color: 'white' }}>
              📄 Generate PDF Report
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div>
          <h3>📥 Import</h3>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste JSON data here..."
            style={{
              width: '100%',
              height: '120px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}
          />
          <button
            onClick={importFromJSON}
            className="btn"
            style={{ marginTop: '8px', backgroundColor: '#9C27B0', color: 'white' }}
            disabled={!importData.trim()}
          >
            📥 Import from JSON
          </button>
        </div>
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
        💡 Snapshots are automatically saved to browser storage. Use export/import for backup or sharing between devices.
      </div>
    </div>
  );
}