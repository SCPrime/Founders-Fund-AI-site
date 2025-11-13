'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData } from '../types';
import { calculateStochastic } from '../utils/indicatorCalculations';

interface StochasticIndicatorProps {
  chart: IChartApi;
  data: CandleData[];
  period?: number;
  signalPeriod?: number;
  visible?: boolean;
}

export default function StochasticIndicator({
  chart,
  data,
  period = 14,
  signalPeriod = 3,
  visible = true,
}: StochasticIndicatorProps) {
  const kLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const dLineRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!visible || !chart || data.length === 0) {
      if (kLineRef.current) {
        chart.removeSeries(kLineRef.current);
        kLineRef.current = null;
      }
      if (dLineRef.current) {
        chart.removeSeries(dLineRef.current);
        dLineRef.current = null;
      }
      return;
    }

    const stochData = calculateStochastic(data, period, signalPeriod);

    if (!kLineRef.current) {
      kLineRef.current = (chart as any).addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: '%K',
        priceScaleId: 'stoch',
      });
    }

    if (!dLineRef.current) {
      dLineRef.current = (chart as any).addLineSeries({
        color: '#FF6D00',
        lineWidth: 2,
        title: '%D',
        priceScaleId: 'stoch',
      });
    }

    chart.priceScale('stoch').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    if (kLineRef.current) {
      kLineRef.current.setData(stochData.k);
    }
    if (dLineRef.current) {
      dLineRef.current.setData(stochData.d);
    }

    return () => {
      if (kLineRef.current) chart.removeSeries(kLineRef.current);
      if (dLineRef.current) chart.removeSeries(dLineRef.current);
    };
  }, [chart, data, period, signalPeriod, visible]);

  return null;
}
