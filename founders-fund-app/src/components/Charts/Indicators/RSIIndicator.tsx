'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData } from '../types';
import { calculateRSI } from '../utils/indicatorCalculations';

interface RSIIndicatorProps {
  chart: IChartApi;
  data: CandleData[];
  period?: number;
  visible?: boolean;
  overbought?: number;
  oversold?: number;
}

export default function RSIIndicator({
  chart,
  data,
  period = 14,
  visible = true,
  overbought = 70,
  oversold = 30,
}: RSIIndicatorProps) {
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const overboughtLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const oversoldLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const midLineRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!visible || !chart || data.length === 0) {
      // Remove series if not visible
      if (rsiSeriesRef.current) {
        chart.removeSeries(rsiSeriesRef.current);
        rsiSeriesRef.current = null;
      }
      if (overboughtLineRef.current) {
        chart.removeSeries(overboughtLineRef.current);
        overboughtLineRef.current = null;
      }
      if (oversoldLineRef.current) {
        chart.removeSeries(oversoldLineRef.current);
        oversoldLineRef.current = null;
      }
      if (midLineRef.current) {
        chart.removeSeries(midLineRef.current);
        midLineRef.current = null;
      }
      return;
    }

    // Calculate RSI data
    const rsiData = calculateRSI(data, period);

    // Create RSI series
    if (!rsiSeriesRef.current) {
      rsiSeriesRef.current = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: `RSI ${period}`,
        priceScaleId: 'rsi',
      });
    }

    // Create reference lines
    if (!overboughtLineRef.current) {
      overboughtLineRef.current = chart.addLineSeries({
        color: 'rgba(255, 0, 0, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'rsi',
      });
    }

    if (!oversoldLineRef.current) {
      oversoldLineRef.current = chart.addLineSeries({
        color: 'rgba(0, 255, 0, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'rsi',
      });
    }

    if (!midLineRef.current) {
      midLineRef.current = chart.addLineSeries({
        color: 'rgba(128, 128, 128, 0.5)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'rsi',
      });
    }

    // Configure RSI price scale
    chart.priceScale('rsi').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Set data
    rsiSeriesRef.current.setData(rsiData);

    // Create reference lines data
    if (rsiData.length > 0) {
      const firstTime = rsiData[0].time;
      const lastTime = rsiData[rsiData.length - 1].time;

      overboughtLineRef.current.setData([
        { time: firstTime, value: overbought },
        { time: lastTime, value: overbought },
      ]);

      oversoldLineRef.current.setData([
        { time: firstTime, value: oversold },
        { time: lastTime, value: oversold },
      ]);

      midLineRef.current.setData([
        { time: firstTime, value: 50 },
        { time: lastTime, value: 50 },
      ]);
    }

    return () => {
      if (rsiSeriesRef.current) {
        chart.removeSeries(rsiSeriesRef.current);
      }
      if (overboughtLineRef.current) {
        chart.removeSeries(overboughtLineRef.current);
      }
      if (oversoldLineRef.current) {
        chart.removeSeries(oversoldLineRef.current);
      }
      if (midLineRef.current) {
        chart.removeSeries(midLineRef.current);
      }
    };
  }, [chart, data, period, visible, overbought, oversold]);

  return null;
}
