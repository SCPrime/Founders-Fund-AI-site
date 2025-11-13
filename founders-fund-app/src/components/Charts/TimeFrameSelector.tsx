'use client';

import { TimeFrame } from './types';

interface TimeFrameSelectorProps {
  selected: TimeFrame;
  onChange: (timeFrame: TimeFrame) => void;
}

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' },
];

export default function TimeFrameSelector({ selected, onChange }: TimeFrameSelectorProps) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded">
      {TIME_FRAMES.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            selected === tf.value
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
