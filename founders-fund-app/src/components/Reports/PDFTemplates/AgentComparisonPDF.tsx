/**
 * Agent Comparison PDF Template Component
 * Side-by-side comparison of all trading agents
 */

'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { AgentComparisonReportData } from '@/lib/pdfGenerator';

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
  summaryBox: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderLeft: '3pt solid #2563eb',
    marginBottom: 15,
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingLeft: 10,
  },
  medal: {
    width: 30,
    fontWeight: 'bold',
  },
  agentName: {
    flex: 1,
    color: '#374151',
  },
  profitValue: {
    width: 100,
    textAlign: 'right',
    fontWeight: 'bold',
  },
});

interface AgentComparisonPDFProps {
  data: AgentComparisonReportData;
}

export const AgentComparisonPDF: React.FC<AgentComparisonPDFProps> = ({ data }) => {
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

  const sortedByProfit = [...data.agents].sort((a, b) => b.totalProfit - a.totalProfit);
  const getMedal = (index: number): string => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page} orientation="landscape">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Agent Comparison Report</Text>
          <Text style={styles.subtitle}>
            Period: {data.window.start} to {data.window.end}
          </Text>
        </View>

        {/* Portfolio Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.sectionTitle}>Portfolio Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Best Performer:</Text>
            <Text style={[styles.value, styles.positiveValue]}>{data.summary.bestPerformer}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Worst Performer:</Text>
            <Text style={[styles.value, styles.negativeValue]}>{data.summary.worstPerformer}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total System Profit:</Text>
            <Text
              style={[
                styles.value,
                data.summary.totalSystemProfit >= 0 ? styles.positiveValue : styles.negativeValue,
              ]}
            >
              {formatCurrency(data.summary.totalSystemProfit)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Average Win Rate:</Text>
            <Text style={styles.value}>{formatPercent(data.summary.avgSystemWinRate)}</Text>
          </View>
        </View>

        {/* Agent Comparison Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent Performance Comparison</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>Agent Name</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Total Profit</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Win Rate</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Total Trades</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Avg Return</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Sharpe Ratio</Text>
            </View>
            {data.agents.map((agent, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{agent.name}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(agent.totalProfit)}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{formatPercent(agent.winRate)}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{agent.totalTrades.toString()}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{formatPercent(agent.avgReturn)}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>
                  {agent.sharpeRatio ? agent.sharpeRatio.toFixed(2) : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Rankings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Rankings (By Total Profit)</Text>
          {sortedByProfit.map((agent, index) => (
            <View key={index} style={styles.rankingItem}>
              <Text style={styles.medal}>{getMedal(index)}</Text>
              <Text style={styles.agentName}>{agent.name}</Text>
              <Text
                style={[
                  styles.profitValue,
                  agent.totalProfit >= 0 ? styles.positiveValue : styles.negativeValue,
                ]}
              >
                {formatCurrency(agent.totalProfit)}
              </Text>
            </View>
          ))}
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <View style={{ marginLeft: 10 }}>
            <Text style={{ marginBottom: 6, fontSize: 9 }}>
              • Total agents analyzed: {data.agents.length}
            </Text>
            <Text style={{ marginBottom: 6, fontSize: 9 }}>
              • Profitable agents:{' '}
              {data.agents.filter((a) => a.totalProfit > 0).length} (
              {formatPercent((data.agents.filter((a) => a.totalProfit > 0).length / data.agents.length) * 100)})
            </Text>
            <Text style={{ marginBottom: 6, fontSize: 9 }}>
              • Average trades per agent:{' '}
              {(data.agents.reduce((sum, a) => sum + a.totalTrades, 0) / data.agents.length).toFixed(0)}
            </Text>
            <Text style={{ marginBottom: 6, fontSize: 9 }}>
              • System-wide win rate: {formatPercent(data.summary.avgSystemWinRate)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {new Date().toLocaleString()}</Text>
          <Text>Founders Fund AI Trading Platform - Multi-Agent Comparison</Text>
        </View>
      </Page>
    </Document>
  );
};

export default AgentComparisonPDF;
