'use client';

import { useEffect, useState } from 'react';
import { IndicatorConfig } from './types';

interface IndicatorSelectorProps {
  onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
  initialIndicators?: IndicatorConfig[];
}

const AVAILABLE_INDICATORS: Omit<IndicatorConfig, 'enabled'>[] = [
  { id: 'ichimoku', name: 'Ichimoku Cloud', params: { tenkan: 9, kijun: 26, senkouB: 52 } },
  { id: 'sma', name: 'Simple Moving Average', params: { periods: '20,50,200' } as any },
  { id: 'ema', name: 'Exponential Moving Average', params: { periods: '12,26,50' } as any },
  { id: 'wma', name: 'Weighted Moving Average', params: { periods: '20,50' } as any },
  { id: 'rsi', name: 'RSI (Relative Strength Index)', params: { period: 14 } },
  { id: 'macd', name: 'MACD', params: { fast: 12, slow: 26, signal: 9 } },
  { id: 'bollinger', name: 'Bollinger Bands', params: { period: 20, stdDev: 2 } },
  { id: 'stochastic', name: 'Stochastic Oscillator', params: { period: 14, signal: 3 } },
  { id: 'atr', name: 'ATR (Average True Range)', params: { period: 14 } },
  { id: 'volume', name: 'Volume Profile', params: { bins: 24 } },
];

export default function IndicatorSelector({
  onIndicatorsChange,
  initialIndicators = [],
}: IndicatorSelectorProps) {
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    return AVAILABLE_INDICATORS.map((indicator) => {
      const initial = initialIndicators.find((i) => i.id === indicator.id);
      return {
        ...indicator,
        enabled: initial?.enabled || false,
        params: initial?.params || indicator.params,
      };
    });
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    onIndicatorsChange(indicators);
  }, [indicators, onIndicatorsChange]);

  const toggleIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id ? { ...indicator, enabled: !indicator.enabled } : indicator,
      ),
    );
  };

  // const updateParams = (id: string, params: Record<string, number>) => {
  //   setIndicators((prev) =>
  //     prev.map((indicator) =>
  //       indicator.id === id ? { ...indicator, params } : indicator
  //     )
  //   );
  // }; // Reserved for future use

  const savePreferences = () => {
    localStorage.setItem('chartIndicators', JSON.stringify(indicators));
  };

  const loadPreferences = () => {
    const saved = localStorage.getItem('chartIndicators');
    if (saved) {
      try {
        setIndicators(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load indicator preferences:', error);
      }
    }
  };

  const resetIndicators = () => {
    setIndicators(AVAILABLE_INDICATORS.map((indicator) => ({ ...indicator, enabled: false })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Indicators ({indicators.filter((i) => i.enabled).length})
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Technical Indicators</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="flex items-start space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <input
                    type="checkbox"
                    checked={indicator.enabled}
                    onChange={() => toggleIndicator(indicator.id)}
                    className="mt-1"
                    id={`indicator-${indicator.id}`}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`indicator-${indicator.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {indicator.name}
                    </label>
                    {indicator.enabled && indicator.params && (
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {Object.entries(indicator.params).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-700 flex gap-2">
              <button
                onClick={savePreferences}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Save Preferences
              </button>
              <button
                onClick={loadPreferences}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Load Saved
              </button>
              <button
                onClick={resetIndicators}
                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
