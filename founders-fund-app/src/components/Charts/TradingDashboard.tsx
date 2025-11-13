'use client';

import { useState, useCallback } from 'react';
import FullScreenChart from './FullScreenChart';
import IndicatorSelector from './IndicatorSelector';
import TimeFrameSelector from './TimeFrameSelector';
import DrawingTools from './DrawingTools';
import { CandleData, IndicatorConfig, TimeFrame, DrawingTool } from './types';

interface TradingDashboardProps {
  initialData?: CandleData[];
  agentId?: string;
  portfolioId?: string;
}

// Generate sample candle data for demonstration
function generateSampleData(count: number): CandleData[] {
  const data: CandleData[] = [];
  let basePrice = 50000;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 1000;
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * 500;
    const low = Math.min(open, close) - Math.random() * 500;
    const volume = Math.random() * 1000 + 500;

    data.push({
      time: ((now - (count - i) * dayMs) / 1000) as any,
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close;
  }

  return data;
}

export default function TradingDashboard({
  initialData,
  agentId,
  portfolioId,
}: TradingDashboardProps) {
  const [data] = useState<CandleData[]>(() => initialData || generateSampleData(200));
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('1d');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [_selectedTool, setSelectedTool] = useState<DrawingTool['type'] | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const handleIndicatorsChange = useCallback((newIndicators: IndicatorConfig[]) => {
    setIndicators(newIndicators);
  }, []);

  const handleToolSelect = useCallback((tool: DrawingTool['type'] | null) => {
    setSelectedTool(tool);
  }, []);

  const handleSaveDrawings = async (drawings: DrawingTool[]) => {
    // Save to database
    try {
      const response = await fetch('/api/chart-drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          agentId,
          drawings,
        }),
      });

      if (!response.ok) throw new Error('Failed to save drawings');
    } catch (error) {
      console.error('Error saving drawings:', error);
      throw error;
    }
  };

  const handleLoadDrawings = async (): Promise<DrawingTool[]> => {
    try {
      const params = new URLSearchParams();
      if (portfolioId) params.append('portfolioId', portfolioId);
      if (agentId) params.append('agentId', agentId);

      const response = await fetch(`/api/chart-drawings?${params}`);
      if (!response.ok) throw new Error('Failed to load drawings');

      const result = await response.json();
      setDrawings(result.drawings || []);
      return result.drawings || [];
    } catch (error) {
      console.error('Error loading drawings:', error);
      throw error;
    }
  };

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} p-6`}>
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Trading Dashboard
          </h1>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap gap-4 items-center">
          <TimeFrameSelector selected={timeFrame} onChange={setTimeFrame} />
          <IndicatorSelector
            onIndicatorsChange={handleIndicatorsChange}
            initialIndicators={indicators}
          />
          <DrawingTools
            onToolSelect={handleToolSelect}
            onSave={handleSaveDrawings}
            onLoad={handleLoadDrawings}
            onClear={handleClearDrawings}
            drawings={drawings}
          />
        </div>

        {/* Main Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <FullScreenChart
            data={data}
            theme={theme}
            height={600}
            indicators={indicators}
            drawings={drawings}
          />
        </div>

        {/* Info Panel */}
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Active Indicators
          </h3>
          <div className="flex flex-wrap gap-2">
            {indicators.filter(i => i.enabled).map(indicator => (
              <span
                key={indicator.id}
                className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm"
              >
                {indicator.name}
              </span>
            ))}
            {indicators.filter(i => i.enabled).length === 0 && (
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                No indicators active. Select from the Indicators menu above.
              </span>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Quick Guide
          </h3>
          <ul className={`list-disc list-inside space-y-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            <li>Click <strong>Indicators</strong> to add technical indicators (RSI, MACD, Bollinger Bands, etc.)</li>
            <li>Use <strong>Time Frame</strong> buttons to change candle intervals</li>
            <li>Click <strong>Drawing Tools</strong> to add trend lines, support/resistance zones</li>
            <li>Press <strong>F11</strong> or click Fullscreen button for immersive chart view</li>
            <li>Scroll to zoom, drag to pan the chart</li>
            <li>Save your preferences and drawings for future sessions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
