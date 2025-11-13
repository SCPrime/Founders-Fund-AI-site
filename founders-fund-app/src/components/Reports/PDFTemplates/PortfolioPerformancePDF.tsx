/**
 * Portfolio Performance PDF Template Component
 * Shows complete portfolio metrics and all participant summary
 */

'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { PortfolioPerformanceReportData } from '@/lib/pdfGenerator';

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
    width: '40%',
    fontWeight: 'bold',
    color: '#111827',
  },
  value: {
    width: '60%',
    color: '#374151',
  },
  positiveValue: {
    color: '#16a34a',
  },
  negativeValue: {
    color: '#dc2626',
  },
  warningValue: {
    color: '#f59e0b',
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
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderLeft: '3pt solid #2563eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
});

interface PortfolioPerformancePDFProps {
  data: PortfolioPerformanceReportData;
}

export const PortfolioPerformancePDF: React.FC<PortfolioPerformancePDFProps> = ({ data }) => {
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

  const foundersCount = data.participants.filter(p => p.type === 'founders').length;
  const investorsCount = data.participants.filter(p => p.type === 'investor').length;

  return (
    <Document>
      <Page size="LETTER" style={styles.page} orientation="landscape">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio Performance Report</Text>
          <Text style={styles.subtitle}>
            Period: {data.window.start} to {data.window.end}
          </Text>
        </View>

        {/* Overall Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Performance</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Profit:</Text>
            <Text style={[styles.value, data.totalProfit >= 0 ? styles.positiveValue : styles.negativeValue]}>
              {formatCurrency(data.totalProfit)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Realized Profit:</Text>
            <Text style={[styles.value, styles.positiveValue]}>{formatCurrency(data.realizedProfit)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Unrealized Profit:</Text>
            <Text style={[styles.value, styles.warningValue]}>{formatCurrency(data.unrealizedProfit)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Wallet Size:</Text>
            <Text style={styles.value}>{formatCurrency(data.walletSize)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Dollar-Days:</Text>
            <Text style={styles.value}>{data.totalDollarDays.toLocaleString()}</Text>
          </View>
        </View>

        {/* Fee Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Structure</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Entry Fee Rate:</Text>
            <Text style={styles.value}>{formatPercent(data.feeStructure.entryFeeRate * 100)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Management Fee Rate:</Text>
            <Text style={styles.value}>{formatPercent(data.feeStructure.mgmtFeeRate * 100)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Management Fees:</Text>
            <Text style={[styles.value, styles.positiveValue]}>
              {formatCurrency(data.feeStructure.totalMgmtFees)}
            </Text>
          </View>
        </View>

        {/* Participants Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participant Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>Name</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Type</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Dollar-Days</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>Share %</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Realized Net</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Moonbag</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>End Capital</Text>
            </View>
            {data.participants.map((participant, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{participant.name}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{participant.type.toUpperCase()}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{participant.dollarDays.toLocaleString()}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{formatPercent(participant.share)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(participant.realizedNet)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(participant.moonbag)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(participant.endCapital)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={styles.summaryBox}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Summary Statistics</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Total Participants:</Text>
            <Text style={styles.value}>{data.participants.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Founders:</Text>
            <Text style={styles.value}>{foundersCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Investors:</Text>
            <Text style={styles.value}>{investorsCount}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {new Date().toLocaleString()}</Text>
          <Text>Founders Fund AI Trading Platform</Text>
        </View>
      </Page>
    </Document>
  );
};

export default PortfolioPerformancePDF;
