'use client';

import { useState, useEffect, useRef } from 'react';
import { useCalculator } from '@/context/CalculatorContext';

export default function Charts() {
  const [source, setSource] = useState('current');
  const [type, setType] = useState('lineNet');
  const [includeFounders, setIncludeFounders] = useState('yes');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calc = useCalculator();

  const generateSampleData = () => {
    // Generate sample data for demonstration
    const labels = ['Laura (7/22)', 'Laura (7/31)', 'Laura (8/25)', 'Laura (9/6)', 'Damon (8/2)'];
    const netProfits = [4500, 4500, 2250, 2250, 4500]; // Net counted amounts
    const baseProfits = [5000, 5000, 2500, 2500, 5000]; // Gross amounts
    const endCapital = [4500, 9000, 11250, 13500, 18000]; // Cumulative

    return { labels, netProfits, baseProfits, endCapital };
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = generateSampleData();
    const { labels, netProfits, baseProfits, endCapital } = data;

    // Chart dimensions
    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Determine data to plot based on type
    let values: number[];
    let chartTitle: string;
    let yAxisTitle: string;

    switch (type) {
      case 'lineNet':
      case 'barNet':
        values = netProfits;
        chartTitle = 'Net Profit by Contributor';
        yAxisTitle = 'Net Profit ($)';
        break;
      case 'barBase':
        values = baseProfits;
        chartTitle = 'Base Contribution by Contributor';
        yAxisTitle = 'Base Amount ($)';
        break;
      case 'lineEnd':
        values = endCapital;
        chartTitle = 'Cumulative Capital by Contributor';
        yAxisTitle = 'End Capital ($)';
        break;
      default:
        values = netProfits;
        chartTitle = 'Net Profit by Contributor';
        yAxisTitle = 'Net Profit ($)';
    }

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue || 1;

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Y-axis
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    // X-axis
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw chart based on type
    if (type.startsWith('bar')) {
      // Bar chart
      const barWidth = chartWidth / labels.length * 0.6;
      const barSpacing = chartWidth / labels.length;

      ctx.fillStyle = '#4CAF50';

      values.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * barSpacing + (barSpacing - barWidth) / 2;
        const y = canvas.height - padding - barHeight;

        ctx.fillRect(x, y, barWidth, barHeight);

        // Value labels on bars
        ctx.fillStyle = '#333';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`$${value.toLocaleString()}`, x + barWidth / 2, y - 5);
        ctx.fillStyle = '#4CAF50';
      });
    } else {
      // Line chart
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 2;
      ctx.beginPath();

      values.forEach((value, index) => {
        const x = padding + (index * chartWidth) / (labels.length - 1);
        const y = canvas.height - padding - ((value - minValue) / valueRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        // Draw points
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';

    labels.forEach((label, index) => {
      const x = padding + (index * chartWidth) / (labels.length - 1);
      const y = canvas.height - padding + 20;

      // Rotate text for better fit
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange * i) / 5;
      const y = canvas.height - padding - (i * chartHeight) / 5;
      ctx.fillText(`$${Math.round(value).toLocaleString()}`, padding - 10, y + 3);
    }

    // Chart title
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(chartTitle, canvas.width / 2, 25);

    // Update legend and axis titles
    const legendEl = document.getElementById('legend');
    const yAxisEl = document.getElementById('yAxisTitle');
    const xAxisEl = document.getElementById('xAxisTitle');
    const noteEl = document.getElementById('chartNote');

    if (legendEl) {
      legendEl.innerHTML = `
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <div style="width: 20px; height: 3px; background: ${type.startsWith('bar') ? '#4CAF50' : '#2196F3'};"></div>
            <span style="font-size: 12px;">${chartTitle}</span>
          </div>
        </div>
      `;
    }

    if (yAxisEl) yAxisEl.textContent = yAxisTitle;
    if (xAxisEl) xAxisEl.textContent = 'Contributors';
    if (noteEl) {
      noteEl.textContent = `Data source: ${source === 'current' ? 'Current calculator state' : 'Saved snapshots'} | ${labels.length} data points`;
    }
  };

  const handleDraw = () => {
    drawChart();
  };

  // Auto-draw chart when component mounts or data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      drawChart();
    }, 100);
    return () => clearTimeout(timer);
  }, [type, source, includeFounders, calc.walletSize, calc.realizedProfit]);

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
        <canvas ref={canvasRef} id="chart" width={1100} height={420}></canvas>
        <div className="legend" id="legend"></div>
        <div className="small" id="chartNote"></div>
        <div className="small" style={{ marginTop: '6px' }}>
          <b id="yAxisTitle"></b> — Y-axis · <b id="xAxisTitle"></b> — X-axis
        </div>
      </div>
    </div>
  );
}
