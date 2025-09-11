'use client';

import { useCalculator } from '@/context/CalculatorContext';
import { useRef, useState } from 'react';

export default function StatusBar() {
  useCalculator();

  const [autoSave, setAutoSave] = useState(true);
  const [calcTime, setCalcTime] = useState('');
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

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Uploaded screenshot', file.name);
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
    </div>
  );
}
