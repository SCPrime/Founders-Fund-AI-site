/**
 * Agent Performance PDF Template Component
 * Detailed performance report for a specific trading agent
 */

'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { AgentPerformanceReportData } from '@/lib/pdfGenerator';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '50%',
    fontWeight: 'bold',
    color: '#111827',
  },
  value: {
    width: '50%',
    color: '#374151',
  },
  positiveValue: {
    color: '#16a34a',
  },
  negativeValue: {
    color: '#dc2626',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    padding: 6,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #e5e7eb',
    padding: 6,
    fontSize: 8,
  },
  tableCell: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  metricBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    border: '1pt solid #e5e7eb',
  },
  metricLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
});

interface AgentPerformancePDFProps {
  data: AgentPerformanceReportData;
}

export const AgentPerformancePDF: React.FC<AgentPerformancePDFProps> = ({ data }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number): string => {
    return `${percent.toFixed(2)}%`;
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Agent Performance Report: {data.agentName}</Text>
          <Text style={styles.subtitle}>
            Period: {data.window.start} to {data.window.end}
          </Text>
        </View>

        {/* Performance Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Trades</Text>
              <Text style={styles.metricValue}>{data.totalTrades}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Win Rate</Text>
              <Text style={[styles.metricValue, data.winRate >= 50 ? styles.positiveValue : styles.negativeValue]}>
                {formatPercent(data.winRate)}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Total Profit</Text>
              <Text style={[styles.metricValue, data.totalProfit >= 0 ? styles.positiveValue : styles.negativeValue]}>
                {formatCurrency(data.totalProfit)}
              </Text>
            </View>
          </View>
        </View>

        {/* Detailed Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Metrics</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Profitable Trades:</Text>
            <Text style={[styles.value, styles.positiveValue]}>
              {data.profitableTrades} / {data.totalTrades}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Return:</Text>
            <Text style={[styles.value, data.averageReturn >= 0 ? styles.positiveValue : styles.negativeValue]}>
              {formatPercent(data.averageReturn)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Best Trade:</Text>
            <Text style={[styles.value, styles.positiveValue]}>{formatCurrency(data.performance.bestTrade)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Worst Trade:</Text>
            <Text style={[styles.value, styles.negativeValue]}>{formatCurrency(data.performance.worstTrade)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Hold Time:</Text>
            <Text style={styles.value}>{data.performance.averageHoldTime}</Text>
          </View>
        </View>

        {/* Trade History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Trade History (Last 20)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Date</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Symbol</Text>
              <Text style={[styles.tableCell, { flex: 0.6 }]}>Type</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Amount</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Price</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Profit</Text>
            </View>
            {data.trades.slice(0, 20).map((trade, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{trade.date}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{trade.symbol}</Text>
                <Text style={[styles.tableCell, { flex: 0.6 }]}>{trade.type}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{trade.amount.toFixed(4)}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{formatCurrency(trade.price)}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>
                  {trade.profit ? formatCurrency(trade.profit) : '-'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {new Date().toLocaleString()}</Text>
          <Text>Founders Fund AI Trading Platform - Agent Analytics</Text>
        </View>
      </Page>
    </Document>
  );
};

export default AgentPerformancePDF;
