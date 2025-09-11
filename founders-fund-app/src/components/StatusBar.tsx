'use client';

import { useCalculator } from '@/context/CalculatorContext';

export default function StatusBar() {
  useCalculator();

  const handleReseed = () => {
    console.log('Reseed defaults');
  };

  const handleRecalc = () => {
    console.log('Recalculate');
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
    </div>
  );
}
