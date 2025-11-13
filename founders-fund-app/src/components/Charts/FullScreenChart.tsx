'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeriesPartialOptions,
  LineSeriesPartialOptions,
  HistogramSeriesPartialOptions,
  Time,
} from 'lightweight-charts';
import { CandleData, ChartTheme, IndicatorConfig, DrawingTool, TimeFrame } from './types';

interface FullScreenChartProps {
  data: CandleData[];
  theme?: 'light' | 'dark';
  height?: number;
  indicators?: IndicatorConfig[];
  drawings?: DrawingTool[];
  onIndicatorToggle?: (indicatorId: string) => void;
  onDrawingAdd?: (drawing: DrawingTool) => void;
  onDrawingRemove?: (drawingId: string) => void;
}

const lightTheme: ChartTheme = {
  background: '#ffffff',
  textColor: '#191919',
  gridColor: '#e1e1e1',
  crosshairColor: '#9598a1',
  upColor: '#26a69a',
  downColor: '#ef5350',
};

const darkTheme: ChartTheme = {
  background: '#1e222d',
  textColor: '#d1d4dc',
  gridColor: '#2b2b43',
  crosshairColor: '#758696',
  upColor: '#26a69a',
  downColor: '#ef5350',
};

export default function FullScreenChart({
  data,
  theme = 'dark',
  height = 600,
  indicators = [],
  drawings = [],
  onIndicatorToggle,
  onDrawingAdd,
  onDrawingRemove,
}: FullScreenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: isFullScreen ? window.innerHeight : height,
      layout: {
        background: { color: currentTheme.background },
        textColor: currentTheme.textColor,
      },
      grid: {
        vertLines: { color: currentTheme.gridColor },
        horzLines: { color: currentTheme.gridColor },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: currentTheme.crosshairColor,
          width: 1,
          style: 0,
          labelBackgroundColor: currentTheme.crosshairColor,
        },
        horzLine: {
          color: currentTheme.crosshairColor,
          width: 1,
          style: 0,
          labelBackgroundColor: currentTheme.crosshairColor,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: currentTheme.gridColor,
      },
      rightPriceScale: {
        borderColor: currentTheme.gridColor,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: currentTheme.upColor,
      downColor: currentTheme.downColor,
      borderUpColor: currentTheme.upColor,
      borderDownColor: currentTheme.downColor,
      wickUpColor: currentTheme.upColor,
      wickDownColor: currentTheme.downColor,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    setChartReady(true);

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isFullScreen ? window.innerHeight : height,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [theme, height, isFullScreen]);

  // Update data
  useEffect(() => {
    if (candleSeriesRef.current && data.length > 0) {
      candleSeriesRef.current.setData(data);
    }
  }, [data]);

  // Toggle fullscreen
  const toggleFullScreen = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (!isFullScreen) {
      chartContainerRef.current.requestFullscreen?.();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullScreen(false);
    }
  }, [isFullScreen]);

  // Handle F11 key for fullscreen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [toggleFullScreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  return (
    <div className="relative w-full">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <button
          onClick={toggleFullScreen}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          title="Toggle Fullscreen (F11)"
        >
          {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
        <button
          onClick={() => {
            if (chartRef.current) {
              chartRef.current.timeScale().fitContent();
            }
          }}
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          title="Fit Content"
        >
          Fit
        </button>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className={`border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} rounded`}
        style={{ height: isFullScreen ? '100vh' : `${height}px` }}
      />

      {/* Loading State */}
      {!chartReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded">
          <div className="text-white">Loading chart...</div>
        </div>
      )}
    </div>
  );
}
