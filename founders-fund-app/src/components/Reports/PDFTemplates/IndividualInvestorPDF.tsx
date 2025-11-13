/**
 * Individual Investor PDF Template Component
 * Privacy-safe report showing only individual investor's data
 * Uses @react-pdf/renderer for React-based PDF generation
 */

'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { IndividualInvestorReportData } from '@/lib/pdfGenerator';

// Register fonts (optional - for better typography)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf',
// });

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
    padding: 8,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #e5e7eb',
    padding: 8,
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
  privacyNotice: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderLeft: '3pt solid #2563eb',
  },
  privacyText: {
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.5,
  },
});

interface IndividualInvestorPDFProps {
  data: IndividualInvestorReportData;
}

export const IndividualInvestorPDF: React.FC<IndividualInvestorPDFProps> = ({ data }) => {
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
          <Text style={styles.title}>Individual Investor Report</Text>
          <Text style={styles.subtitle}>Privacy-Protected Report for {data.investorName}</Text>
        </View>

        {/* Report Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Period</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Start Date:</Text>
            <Text style={styles.value}>{data.window.start}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>End Date:</Text>
            <Text style={styles.value}>{data.window.end}</Text>
          </View>
        </View>

        {/* Performance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Contributed:</Text>
            <Text style={styles.value}>{formatCurrency(data.totalContributed)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Entry Fees Paid:</Text>
            <Text style={[styles.value, styles.negativeValue]}>{formatCurrency(data.entryFees)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dollar-Days Accumulated:</Text>
            <Text style={styles.value}>{data.dollarDays.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Portfolio Share:</Text>
            <Text style={[styles.value, styles.positiveValue]}>{formatPercent(data.sharePercent)}</Text>
          </View>
        </View>

        {/* Returns & Allocation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Returns & Allocation</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Realized Gross:</Text>
            <Text style={styles.value}>{formatCurrency(data.realizedGross)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Management Fee:</Text>
            <Text style={[styles.value, styles.negativeValue]}>{formatCurrency(data.managementFee)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Realized Net:</Text>
            <Text style={[styles.value, data.realizedNet >= 0 ? styles.positiveValue : styles.negativeValue]}>
              {formatCurrency(data.realizedNet)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Unrealized (Moonbag):</Text>
            <Text style={[styles.value, styles.warningValue]}>{formatCurrency(data.moonbag)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>End Capital:</Text>
            <Text style={[styles.value, styles.positiveValue]}>{formatCurrency(data.endCapital)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>ROI:</Text>
            <Text style={[styles.value, data.roi >= 0 ? styles.positiveValue : styles.negativeValue]}>
              {formatPercent(data.roi)}
            </Text>
          </View>
        </View>

        {/* Contribution History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contribution History</Text>
          {data.contributions.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>Date</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Type</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>Amount</Text>
              </View>
              {data.contributions.map((contribution, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{contribution.date}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{contribution.type}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{formatCurrency(contribution.amount)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.value, { color: '#6b7280' }]}>
              No contributions recorded for this period.
            </Text>
          )}
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyNotice}>
          <Text style={styles.privacyText}>
            Privacy Notice: This report contains only your investment data. Information about other investors
            is not included to maintain privacy and confidentiality.
          </Text>
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

export default IndividualInvestorPDF;
