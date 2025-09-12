'use client';

import { useCalculator } from '@/context/CalculatorContext';
import { useRef, useState } from 'react';

export default function StatusBar() {
  useCalculator();

  const [autoSave, setAutoSave] = useState(true);
  const [calcTime, setCalcTime] = useState('');
  const [analysis, setAnalysis] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleReseed = () => {
    console.log('Reseed defaults');
  };

  const handleRecalc = () => {
    const start = performance.now();
    console.log('Recalculate');
    const end = performance.now();
    setCalcTime(`Calculated in ${(end - start).toFixed(2)} ms`);
  };

  const handleSelfTest = () => {
    console.log('Self-Test');
  };

  const handleSaveSnap = () => {
    console.log('Save snapshot');
  };

  const handleUploadClick = () => {
    fileRef.current?.click();
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setAnalysis(data);
      setMessage('');
    } catch (err) {
      console.error('Analyze error', err);
      setMessage('Failed to analyze image');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleConfirmSave = async () => {
    if (!analysis) return;
    try {
      const res = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis }),
      });
      if (res.ok) {
        setMessage('Analysis saved successfully');
      } else {
        setMessage('Failed to save analysis');
      }
    } catch (err) {
      console.error('Save analysis error', err);
      setMessage('Failed to save analysis');
    } finally {
      setAnalysis(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="status">
      <span className="dot ok" />
      <b>Calculator ready.</b>
      <span id="seedMsg" className="small">
        Seeding defaults…
      </span>
      <button className="btn" onClick={handleReseed}>
        Force re-seed
      </button>
      <button className="btn" onClick={handleRecalc}>
        Recalculate
      </button>
      <button className="btn" onClick={handleSelfTest}>
        Self-Test
      </button>
      <label className="small">
        <input
          type="checkbox"
          checked={autoSave}
          onChange={e => setAutoSave(e.target.checked)}
        />{' '}
        Auto-save on Recalculate
      </label>
      <button className="btn" onClick={handleSaveSnap}>
        Save snapshot now
      </button>
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        style={{ display: 'none' }}
        onChange={handleScreenshot}
      />
      <button className="btn" onClick={handleUploadClick}>
        Upload Screenshot
      </button>
      <span className="small">{calcTime}</span>
      {analysis && (
        <div className="analysis-preview">
          <pre>{JSON.stringify(analysis, null, 2)}</pre>
          <button className="btn" onClick={handleConfirmSave}>
            Save Analysis
          </button>
        </div>
      )}
      {message && <span className="small">{message}</span>}
    </div>
  );
}
