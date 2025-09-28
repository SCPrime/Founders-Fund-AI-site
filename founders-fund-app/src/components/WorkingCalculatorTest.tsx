'use client';

import { useState } from 'react';
import { computeAllocation, fromAllocationStore, CalculatorInputs, CalculatorOutputs } from '@/utils/calculator-core';
import { useFundStore } from '@/store/fundStore';

export default function WorkingCalculatorTest() {
  const [result, setResult] = useState<CalculatorOutputs | null>(null);
  const fundStore = useFundStore();

  const runTest = () => {
    console.log('🧪 Testing Working Calculator with current fund store data...');

    // Get inputs from current store
    const inputs = fromAllocationStore(fundStore);
    console.log('📥 Calculator inputs:', inputs);

    // Run calculation
    const outputs = computeAllocation(inputs);
    console.log('📤 Calculator outputs:', outputs);

    setResult(outputs);
  };

  const runManualTest = () => {
    console.log('🧪 Testing Working Calculator with manual test data...');

    // Test data similar to the HTML calculator
    const testInputs: CalculatorInputs = {
      winStart: '2025-08-30',
      winEnd: '2025-09-28',
      walletSize: 25000,
      realizedProfit: 1500,
      moonbagReal: 0,
      moonbagUnreal: 0,
      includeUnreal: false,
      moonbagFounderPct: 75,
      mgmtFeePct: 20,
      entryFeePct: 10,
      feeReducesInvestor: true,
      founderCount: 2,
      drawPerFounder: 0,
      applyDraws: false,
      domLeadPct: 0,
      founders: [
        { date: '2025-07-10', amount: 5000 }
      ],
      investors: [
        { name: 'Laura', date: '2025-08-25', amount: 12000, rule: 'default' },
        { name: 'Bob', date: '2025-09-05', amount: 8000, rule: 'default' }
      ]
    };

    console.log('📥 Test inputs:', testInputs);

    const outputs = computeAllocation(testInputs);
    console.log('📤 Test outputs:', outputs);

    setResult(outputs);
  };

  const money = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="panel" style={{ margin: '16px 0' }}>
      <h3>Working Calculator Test</h3>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          className="btn"
          onClick={runTest}
          style={{ backgroundColor: 'var(--accent)', color: 'var(--ink)' }}
        >
          Test with Current Store Data
        </button>
        <button
          className="btn"
          onClick={runManualTest}
          style={{ backgroundColor: 'var(--good)', color: 'var(--ink)' }}
        >
          Test with Manual Data
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '16px' }}>
          <h4>📊 Calculation Results</h4>

          {/* Summary */}
          <div style={{
            backgroundColor: 'var(--ink)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              <div>Period: {result.start} → {result.end}</div>
              <div>Total Days: {result.totalDays}</div>
              <div>Profit Core: {money(result.summary.profitCore)}</div>
              <div>Total Dollar-Days: {Math.round(result.summary.totalDD).toLocaleString()}</div>
              <div>Founders Share: {(result.summary.shareF * 100).toFixed(1)}%</div>
              <div>Dominance: <span style={{ color: result.summary.domState === 'good' ? 'var(--good)' : result.summary.domState === 'warn' ? 'var(--warn)' : 'var(--bad)' }}>
                {result.summary.domMsg}
              </span></div>
            </div>
          </div>

          {/* Founders Results */}
          <div style={{
            backgroundColor: 'var(--ink)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>👥 Founders</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              <div>Start Capital: {money(result.founders.startCap)}</div>
              <div>In-Window Contrib: {money(result.founders.contribInWin)}</div>
              <div>Dollar-Days: {Math.round(result.founders.dd).toLocaleString()}</div>
              <div>Base Profit: {money(result.founders.base)}</div>
              <div>Net Profit: {money(result.founders.net)}</div>
              <div>End Capital: {money(result.founders.end)}</div>
              <div>PGP: {(result.founders.pgp * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Investors Results */}
          {result.investors.length > 0 && (
            <div style={{
              backgroundColor: 'var(--ink)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid var(--line)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>💼 Investors</div>
              {result.investors.map((investor, i) => (
                <div key={i} style={{
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: i < result.investors.length - 1 ? '1px solid var(--line)' : 'none'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{investor.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px', fontSize: '12px' }}>
                    <div>Start: {money(investor.startCap)}</div>
                    <div>Contrib: {money(investor.contribInWin)}</div>
                    <div>DD: {Math.round(investor.dd).toLocaleString()}</div>
                    <div>Base: {money(investor.base)}</div>
                    <div>Fee: {money(investor.feeMgmt)}</div>
                    <div>Net: {money(investor.net)}</div>
                    <div>End: {money(investor.end)}</div>
                    <div>PGP: {(investor.pgp * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fee Breakdown */}
          <div style={{
            backgroundColor: 'var(--ink)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--line)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>💰 Fees & Moonbag</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              <div>Mgmt Fees from Investors: {money(result.summary.feeFromI_total)}</div>
              <div>Total Fees to Founders: {money(result.summary.feesToFounders_total)}</div>
              <div>Investors Net Total: {money(result.summary.investorsNetTotal)}</div>
              <div>Moonbag Realized: {money(result.moonbag.moonbagReal)}</div>
              <div>Moonbag Unrealized: {money(result.moonbag.moonbagUnreal)}</div>
              <div>End Pool Total: {money(result.summary.endSum)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}