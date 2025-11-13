'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData } from '../types';
import { calculateBollingerBands } from '../utils/indicatorCalculations';

interface BollingerBandsProps {
  chart: IChartApi;
  data: CandleData[];
  period?: number;
  stdDev?: number;
  visible?: boolean;
}

export default function BollingerBands({
  chart,
  data,
  period = 20,
  stdDev = 2,
  visible = true,
}: BollingerBandsProps) {
  const upperBandRef = useRef<ISeriesApi<'Line'> | null>(null);
  const middleBandRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerBandRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!visible || !chart || data.length === 0) {
      // Remove series if not visible
      if (upperBandRef.current) {
        chart.removeSeries(upperBandRef.current);
        upperBandRef.current = null;
      }
      if (middleBandRef.current) {
        chart.removeSeries(middleBandRef.current);
        middleBandRef.current = null;
      }
      if (lowerBandRef.current) {
        chart.removeSeries(lowerBandRef.current);
        lowerBandRef.current = null;
      }
      return;
    }

    // Calculate Bollinger Bands data
    const bbData = calculateBollingerBands(data, period, stdDev);

    // Create series
    if (!upperBandRef.current) {
      upperBandRef.current = chart.addLineSeries({
        color: 'rgba(41, 98, 255, 0.5)',
        lineWidth: 1,
        title: 'BB Upper',
      });
    }

    if (!middleBandRef.current) {
      middleBandRef.current = chart.addLineSeries({
        color: 'rgba(41, 98, 255, 0.8)',
        lineWidth: 2,
        title: `BB Middle (${period})`,
      });
    }

    if (!lowerBandRef.current) {
      lowerBandRef.current = chart.addLineSeries({
        color: 'rgba(41, 98, 255, 0.5)',
        lineWidth: 1,
        title: 'BB Lower',
      });
    }

    // Set data
    upperBandRef.current.setData(bbData.upper);
    middleBandRef.current.setData(bbData.middle);
    lowerBandRef.current.setData(bbData.lower);

    return () => {
      if (upperBandRef.current) {
        chart.removeSeries(upperBandRef.current);
      }
      if (middleBandRef.current) {
        chart.removeSeries(middleBandRef.current);
      }
      if (lowerBandRef.current) {
        chart.removeSeries(lowerBandRef.current);
      }
    };
  }, [chart, data, period, stdDev, visible]);

  return null;
}
