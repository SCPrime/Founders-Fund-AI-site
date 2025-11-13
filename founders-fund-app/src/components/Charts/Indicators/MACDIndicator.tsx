'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData } from '../types';
import { calculateMACD } from '../utils/indicatorCalculations';

interface MACDIndicatorProps {
  chart: IChartApi;
  data: CandleData[];
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  visible?: boolean;
}

export default function MACDIndicator({
  chart,
  data,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  visible = true,
}: MACDIndicatorProps) {
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const signalLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const histogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!visible || !chart || data.length === 0) {
      // Remove series if not visible
      if (macdLineRef.current) {
        chart.removeSeries(macdLineRef.current);
        macdLineRef.current = null;
      }
      if (signalLineRef.current) {
        chart.removeSeries(signalLineRef.current);
        signalLineRef.current = null;
      }
      if (histogramRef.current) {
        chart.removeSeries(histogramRef.current);
        histogramRef.current = null;
      }
      return;
    }

    // Calculate MACD data
    const macdData = calculateMACD(data, fastPeriod, slowPeriod, signalPeriod);

    // Create MACD line series
    if (!macdLineRef.current) {
      macdLineRef.current = (chart as any).addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: 'MACD',
        priceScaleId: 'macd',
      });
    }

    // Create Signal line series
    if (!signalLineRef.current) {
      signalLineRef.current = (chart as any).addLineSeries({
        color: '#FF6D00',
        lineWidth: 2,
        title: 'Signal',
        priceScaleId: 'macd',
      });
    }

    // Create Histogram series
    if (!histogramRef.current) {
      histogramRef.current = (chart as any).addHistogramSeries({
        priceScaleId: 'macd',
      });
    }

    // Configure MACD price scale
    chart.priceScale('macd').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Set data
    if (macdLineRef.current) {
      macdLineRef.current.setData(macdData.macd);
    }
    if (signalLineRef.current) {
      signalLineRef.current.setData(macdData.signal);
    }
    if (histogramRef.current) {
      histogramRef.current.setData(macdData.histogram);
    }

    return () => {
      if (macdLineRef.current) {
        chart.removeSeries(macdLineRef.current);
      }
      if (signalLineRef.current) {
        chart.removeSeries(signalLineRef.current);
      }
      if (histogramRef.current) {
        chart.removeSeries(histogramRef.current);
      }
    };
  }, [chart, data, fastPeriod, slowPeriod, signalPeriod, visible]);

  return null;
}
