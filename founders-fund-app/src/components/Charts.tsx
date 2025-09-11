'use client';

import { useState } from 'react';

export default function Charts() {
  const [source, setSource] = useState('current');
  const [type, setType] = useState('lineNet');
  const [includeFounders, setIncludeFounders] = useState('yes');

  const handleDraw = () => {
    console.log('Draw chart', { source, type, includeFounders });
  };

  return (
    <div className="panel">
      <h2>Charts</h2>
      <div className="grid" style={{ alignItems: 'center' }}>
        <div style={{ gridColumn: 'span 4' }}>
          <label>Data Source</label>
          <select value={source} onChange={e => setSource(e.target.value)}>
            <option value="current">Current (on screen)</option>
            <option value="latest">Latest saved snapshot</option>
            <option value="all">All saved snapshots (time series)</option>
          </select>
        </div>
        <div style={{ gridColumn: 'span 5' }}>
          <label>Chart Type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="lineNet">Line — Net profit (per class)</option>
            <option value="barNet">Bar — Net profit (per class)</option>
            <option value="barBase">Bar — Base profit (per class)</option>
            <option value="lineEnd">Line — End capital (per class)</option>
            <option value="linePGP">Line — PGP (period %, time-weighted)</option>
          </select>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label>Include Founders in line charts?</label>
          <select
            value={includeFounders}
            onChange={e => setIncludeFounders(e.target.value)}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <label>&nbsp;</label>
          <button className="btn" onClick={handleDraw}>
            Draw
          </button>
        </div>
      </div>
      <div style={{ marginTop: '12px' }}>
        <canvas id="chart" width={1100} height={420}></canvas>
        <div className="legend" id="legend"></div>
        <div className="small" id="chartNote"></div>
        <div className="small" style={{ marginTop: '6px' }}>
          <b id="yAxisTitle"></b> — Y-axis · <b id="xAxisTitle"></b> — X-axis
        </div>
      </div>
    </div>
  );
}
