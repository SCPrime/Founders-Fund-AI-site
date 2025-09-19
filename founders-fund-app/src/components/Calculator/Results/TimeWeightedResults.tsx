'use client';

import { useCalculator } from '@/context/CalculatorContext';
import { useEffect, useState } from 'react';

interface InvestorContribution {
  name: string;
  date: string;
  amount: number;
  rule: string;
  cls: string;
}

interface CalculatedResult {
  name: string;
  cls: string;
  startCapital: number;
  contributions: number;
  dollarDays: number;
  twShare: number;
  baseProfitShare: number;
  regularFee: number;
  moonbag: number;
  draws: number;
  netProfit: number;
  pgp: number;
  endCapital: number;
}

export default function TimeWeightedResults() {
  const calc = useCalculator();
  const [results, setResults] = useState<CalculatedResult[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalContributions: 0,
    totalDollarDays: 0,
    totalBaseProfitShare: 0,
    totalFees: 0,
    totalNetProfit: 0
  });

  useEffect(() => {
    const calculateResults = () => {
      // Get investor data from global window object if available
      const investorData = (window as any).getInvestorData?.() || [];

      if (investorData.length === 0) {
        setResults([]);
        return;
      }

      const windowStart = new Date(calc.winStart);
      const windowEnd = new Date(calc.winEnd);
      const windowDays = Math.max(1, Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24)));

      // Group contributions by investor
      const investorGroups: { [key: string]: InvestorContribution[] } = {};

      investorData.forEach((contrib: any) => {
        const key = `${contrib.name || 'Unknown'}_${contrib.cls || 'investor'}`;
        if (!investorGroups[key]) {
          investorGroups[key] = [];
        }
        investorGroups[key].push({
          name: contrib.name || 'Unknown',
          date: contrib.date,
          amount: Number(contrib.amount) || 0,
          rule: contrib.rule || 'net',
          cls: contrib.cls || 'investor'
        });
      });

      const calculatedResults: CalculatedResult[] = [];
      let totalDollarDays = 0;

      // Calculate dollar-days for each investor
      Object.values(investorGroups).forEach(contributions => {
        if (contributions.length === 0) return;

        const investor = contributions[0];
        let dollarDays = 0;
        let totalContributions = 0;

        contributions.forEach(contrib => {
          const contribDate = new Date(contrib.date);
          if (contribDate >= windowStart && contribDate <= windowEnd) {
            const daysInWindow = Math.max(0, Math.ceil((windowEnd.getTime() - contribDate.getTime()) / (1000 * 60 * 60 * 24)));
            dollarDays += contrib.amount * daysInWindow;
            totalContributions += contrib.amount;
          }
        });

        // For founders, include their $5,000 seed amount in start capital
        const startCapital = investor.cls === 'founder' ? 5000 : 0;

        calculatedResults.push({
          name: investor.name,
          cls: investor.cls,
          startCapital: startCapital,
          contributions: totalContributions,
          dollarDays: dollarDays,
          twShare: 0, // Will calculate after total is known
          baseProfitShare: 0,
          regularFee: 0,
          moonbag: 0,
          draws: investor.cls === 'founder' ? calc.drawPerFounder : 0,
          netProfit: 0,
          pgp: 0,
          endCapital: 0
        });

        totalDollarDays += dollarDays;
      });

      // Calculate time-weighted shares and profits
      const totalRealizedProfit = calc.realizedProfit;
      const mgmtFeeRate = calc.mgmtFeePct / 100;
      const entryFeeRate = calc.entryFeePct / 100;

      let totalBaseProfitShare = 0;
      let totalFees = 0;
      let totalNetProfit = 0;
      let totalContributions = 0;

      // First pass: calculate time-weighted shares and base profits
      calculatedResults.forEach(result => {
        result.twShare = totalDollarDays > 0 ? (result.dollarDays / totalDollarDays) * 100 : 0;
        result.baseProfitShare = (result.twShare / 100) * totalRealizedProfit;
      });

      // Calculate totals for fee distribution
      const totalInvestorMgmtFees = calculatedResults
        .filter(r => r.cls === 'investor')
        .reduce((sum, r) => sum + (r.baseProfitShare * mgmtFeeRate), 0);

      const totalInvestorEntryFees = calculatedResults
        .filter(r => r.cls === 'investor')
        .reduce((sum, r) => sum + (r.contributions * entryFeeRate), 0);

      const founderCount = calculatedResults.filter(r => r.cls === 'founder').length || calc.founderCount;
      const totalUnrealizedProfit = calc.moonbagUnreal || 0;

      // Second pass: calculate fees and moonbag
      calculatedResults.forEach(result => {
        // Management fees
        if (result.cls === 'investor') {
          result.regularFee = -(result.baseProfitShare * mgmtFeeRate); // Negative = they pay
        } else if (result.cls === 'founder') {
          result.regularFee = totalInvestorMgmtFees / Math.max(1, founderCount); // Positive = they receive
        }

        // Entry fees
        let entryFeeAmount = 0;
        if (result.cls === 'investor') {
          entryFeeAmount = -(result.contributions * entryFeeRate); // Negative = they pay
          if (calc.feeReducesInvestor === 'yes') {
            result.contributions *= (1 - entryFeeRate); // Reduce their effective contribution
          }
        } else if (result.cls === 'founder') {
          entryFeeAmount = totalInvestorEntryFees / Math.max(1, founderCount); // Positive = they receive
        }

        // Moonbag distribution: 75% to founders, 25% time-weighted to investors (no mgmt fees)
        if (result.cls === 'founder') {
          result.moonbag = (totalUnrealizedProfit * 0.75) / Math.max(1, founderCount);
        } else if (result.cls === 'investor') {
          // 25% of unrealized profit distributed time-weighted to investors
          result.moonbag = (totalUnrealizedProfit * 0.25) * (result.twShare / 100);
        }

        // Combine all fees for display
        result.regularFee += entryFeeAmount;

        // Net profit (base profit + fees + moonbag - draws)
        // Note: regularFee is already signed correctly (+ for receiving, - for paying)
        result.netProfit = result.baseProfitShare + result.regularFee + result.moonbag - result.draws;

        // Period Gross Profit percentage
        result.pgp = result.contributions > 0 ? (result.netProfit / result.contributions) * 100 : 0;

        // End capital
        result.endCapital = result.contributions + result.netProfit;

        // Accumulate totals
        totalBaseProfitShare += result.baseProfitShare;
        totalFees += result.regularFee;
        totalNetProfit += result.netProfit;
        totalContributions += result.contributions;
      });

      setResults(calculatedResults);
      setTotalStats({
        totalContributions,
        totalDollarDays,
        totalBaseProfitShare,
        totalFees,
        totalNetProfit
      });
    };

    calculateResults();
  }, [calc.winStart, calc.winEnd, calc.realizedProfit, calc.mgmtFeePct, calc.entryFeePct, calc.feeReducesInvestor, calc.moonbagReal, calc.moonbagFounderPct, calc.founderCount, calc.drawPerFounder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  return (
    <div className="panel">
      <h2>Results (time-weighted)</h2>
      <div className="small">
        Window: {calc.winStart} to {calc.winEnd} |
        Total Realized Profit: {formatCurrency(calc.realizedProfit)} |
        Management Fee: {calc.mgmtFeePct}% | Entry Fee: {calc.entryFeePct}%
      </div>
      <div className="tablewrap">
        <table style={{ marginTop: '10px' }}>
          <thead>
            <tr>
              <th>Class / Name</th>
              <th className="right">Start-of-window capital</th>
              <th className="right">Contribs in window</th>
              <th className="right">Dollar-days (weight)</th>
              <th className="right">TW Share %</th>
              <th className="right">Base profit share</th>
              <th className="right">Regular fund fee ({calc.mgmtFeePct}%)</th>
              <th className="right">Moonbag (realized)</th>
              <th className="right">Draws</th>
              <th className="right">Net Profit (after fees)</th>
              <th className="right">PGP (period %)</th>
              <th className="right">End capital</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={12} className="muted">
                  No investor data available. Add investors in the table above or click "Load baseline" to see results.
                </td>
              </tr>
            ) : (
              results.map((result, index) => (
                <tr key={index} className={result.cls === 'founder' ? 'founder-row' : 'investor-row'}>
                  <td>
                    <strong>{result.name}</strong>
                    <br />
                    <span className="small">{result.cls}</span>
                  </td>
                  <td className="right">{formatCurrency(result.startCapital)}</td>
                  <td className="right">{formatCurrency(result.contributions)}</td>
                  <td className="right">{result.dollarDays.toLocaleString()}</td>
                  <td className="right">{formatPercent(result.twShare)}</td>
                  <td className="right">{formatCurrency(result.baseProfitShare)}</td>
                  <td className="right">{formatCurrency(result.regularFee)}</td>
                  <td className="right">{formatCurrency(result.moonbag)}</td>
                  <td className="right">{formatCurrency(result.draws)}</td>
                  <td className="right"><strong>{formatCurrency(result.netProfit)}</strong></td>
                  <td className="right">{formatPercent(result.pgp)}</td>
                  <td className="right">{formatCurrency(result.endCapital)}</td>
                </tr>
              ))
            )}
            {results.length > 0 && (
              <tr className="total-row" style={{ borderTop: '2px solid #333', fontWeight: 'bold' }}>
                <td>TOTALS</td>
                <td className="right">-</td>
                <td className="right">{formatCurrency(totalStats.totalContributions)}</td>
                <td className="right">{totalStats.totalDollarDays.toLocaleString()}</td>
                <td className="right">100.0%</td>
                <td className="right">{formatCurrency(totalStats.totalBaseProfitShare)}</td>
                <td className="right">{formatCurrency(totalStats.totalFees)}</td>
                <td className="right">-</td>
                <td className="right">-</td>
                <td className="right"><strong>{formatCurrency(totalStats.totalNetProfit)}</strong></td>
                <td className="right">-</td>
                <td className="right">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="small" id="domNote">
        {calc.domLeadPct > 0 && (
          <>Dominant Lead Fee: {calc.domLeadPct}% applied to calculations above.</>
        )}
      </div>
    </div>
  );
}
