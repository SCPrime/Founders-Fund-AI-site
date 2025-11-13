'use client';

import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import type { CandleData } from '../types';
import { calculateIchimoku } from '../utils/indicatorCalculations';

interface IchimokuIndicatorProps {
  chart: IChartApi;
  data: CandleData[];
  tenkanPeriod?: number;
  kijunPeriod?: number;
  senkouBPeriod?: number;
  displacement?: number;
  visible?: boolean;
}

export default function IchimokuIndicator({
  chart,
  data,
  tenkanPeriod = 9,
  kijunPeriod = 26,
  senkouBPeriod = 52,
  displacement = 26,
  visible = true,
}: IchimokuIndicatorProps) {
  const seriesRefs = useRef<{
    tenkan: ISeriesApi<'Line'> | null;
    kijun: ISeriesApi<'Line'> | null;
    senkouA: ISeriesApi<'Line'> | null;
    senkouB: ISeriesApi<'Line'> | null;
    chikou: ISeriesApi<'Line'> | null;
  }>({
    tenkan: null,
    kijun: null,
    senkouA: null,
    senkouB: null,
    chikou: null,
  });

  useEffect(() => {
    if (!visible || !chart || data.length === 0) {
      // Remove series if not visible
      Object.values(seriesRefs.current).forEach((series) => {
        if (series) {
          chart.removeSeries(series);
        }
      });
      seriesRefs.current = {
        tenkan: null,
        kijun: null,
        senkouA: null,
        senkouB: null,
        chikou: null,
      };
      return;
    }

    // Calculate Ichimoku data
    const ichimokuData = calculateIchimoku(
      data,
      tenkanPeriod,
      kijunPeriod,
      senkouBPeriod,
      displacement,
    );

    // Create or update series
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight-charts type compatibility
    if (!seriesRefs.current.tenkan) {
      seriesRefs.current.tenkan = (chart as any).addLineSeries({
        color: '#0496ff',
        lineWidth: 1,
        title: 'Tenkan-sen',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight-charts type compatibility
    if (!seriesRefs.current.kijun) {
      seriesRefs.current.kijun = (chart as any).addLineSeries({
        color: '#991515',
        lineWidth: 1,
        title: 'Kijun-sen',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight-charts type compatibility
    if (!seriesRefs.current.senkouA) {
      seriesRefs.current.senkouA = (chart as any).addLineSeries({
        color: 'rgba(0, 255, 0, 0.3)',
        lineWidth: 1,
        title: 'Senkou Span A',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight-charts type compatibility
    if (!seriesRefs.current.senkouB) {
      seriesRefs.current.senkouB = (chart as any).addLineSeries({
        color: 'rgba(255, 0, 0, 0.3)',
        lineWidth: 1,
        title: 'Senkou Span B',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight-charts type compatibility
    if (!seriesRefs.current.chikou) {
      seriesRefs.current.chikou = (chart as any).addLineSeries({
        color: '#00ff00',
        lineWidth: 1,
        title: 'Chikou Span',
      });
    }

    // Set data
    if (seriesRefs.current.tenkan) {
      seriesRefs.current.tenkan.setData(ichimokuData.tenkan);
    }
    if (seriesRefs.current.kijun) {
      seriesRefs.current.kijun.setData(ichimokuData.kijun);
    }
    if (seriesRefs.current.senkouA) {
      seriesRefs.current.senkouA.setData(ichimokuData.senkouA);
    }
    if (seriesRefs.current.senkouB) {
      seriesRefs.current.senkouB.setData(ichimokuData.senkouB);
    }
    if (seriesRefs.current.chikou) {
      seriesRefs.current.chikou.setData(ichimokuData.chikou);
    }

    return () => {
      // Cleanup
      Object.values(seriesRefs.current).forEach((series) => {
        if (series) {
          chart.removeSeries(series);
        }
      });
    };
  }, [chart, data, tenkanPeriod, kijunPeriod, senkouBPeriod, displacement, visible]);

  return null;
}
