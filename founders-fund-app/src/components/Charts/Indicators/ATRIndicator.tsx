'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { CandleData } from '../types';
import { calculateATR } from '../utils/indicatorCalculations';

interface ATRIndicatorProps {
  chart: IChartApi;
  data: CandleData[];
  period?: number;
  visible?: boolean;
}

export default function ATRIndicator({
  chart,
  data,
  period = 14,
  visible = true,
}: ATRIndicatorProps) {
  const atrSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!visible || !chart || data.length === 0) {
      if (atrSeriesRef.current) {
        chart.removeSeries(atrSeriesRef.current);
        atrSeriesRef.current = null;
      }
      return;
    }

    const atrData = calculateATR(data, period);

    if (!atrSeriesRef.current) {
      atrSeriesRef.current = chart.addLineSeries({
        color: '#00C853',
        lineWidth: 2,
        title: `ATR ${period}`,
        priceScaleId: 'atr',
      });
    }

    chart.priceScale('atr').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    atrSeriesRef.current.setData(atrData);

    return () => {
      if (atrSeriesRef.current) {
        chart.removeSeries(atrSeriesRef.current);
      }
    };
  }, [chart, data, period, visible]);

  return null;
}
