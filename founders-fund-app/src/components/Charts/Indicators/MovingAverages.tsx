'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData } from '../types';
import { calculateSMA, calculateEMA, calculateWMA } from '../utils/indicatorCalculations';

interface MovingAveragesProps {
  chart: IChartApi;
  data: CandleData[];
  sma?: { enabled: boolean; periods: number[] };
  ema?: { enabled: boolean; periods: number[] };
  wma?: { enabled: boolean; periods: number[] };
}

const colors = ['#2962FF', '#FF6D00', '#00C853', '#AA00FF', '#FFD600'];

export default function MovingAverages({
  chart,
  data,
  sma = { enabled: false, periods: [] },
  ema = { enabled: false, periods: [] },
  wma = { enabled: false, periods: [] },
}: MovingAveragesProps) {
  const seriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  useEffect(() => {
    if (!chart || data.length === 0) return;

    // Clear existing series
    seriesRefs.current.forEach((series) => {
      chart.removeSeries(series);
    });
    seriesRefs.current.clear();

    let colorIndex = 0;

    // Add SMA series
    if (sma.enabled && sma.periods.length > 0) {
      sma.periods.forEach((period) => {
        const smaData = calculateSMA(data, period);
        const series = (chart as any).addLineSeries({
          color: colors[colorIndex % colors.length],
          lineWidth: 2,
          title: `SMA ${period}`,
        });
        series.setData(smaData);
        seriesRefs.current.set(`sma-${period}`, series);
        colorIndex++;
      });
    }

    // Add EMA series
    if (ema.enabled && ema.periods.length > 0) {
      ema.periods.forEach((period) => {
        const emaData = calculateEMA(data, period);
        const series = (chart as any).addLineSeries({
          color: colors[colorIndex % colors.length],
          lineWidth: 2,
          title: `EMA ${period}`,
        });
        series.setData(emaData);
        seriesRefs.current.set(`ema-${period}`, series);
        colorIndex++;
      });
    }

    // Add WMA series
    if (wma.enabled && wma.periods.length > 0) {
      wma.periods.forEach((period) => {
        const wmaData = calculateWMA(data, period);
        const series = (chart as any).addLineSeries({
          color: colors[colorIndex % colors.length],
          lineWidth: 2,
          title: `WMA ${period}`,
        });
        series.setData(wmaData);
        seriesRefs.current.set(`wma-${period}`, series);
        colorIndex++;
      });
    }

    return () => {
      seriesRefs.current.forEach((series) => {
        chart.removeSeries(series);
      });
      seriesRefs.current.clear();
    };
  }, [chart, data, sma, ema, wma]);

  return null;
}
