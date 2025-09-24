'use client';

import { useFundStore } from '@/store/fundStore';
import { useEffect, useState } from 'react';

interface InvestorFee {
  name: string;
  baseProfitShare: number;
  feeRate: number;
  feeAmount: number;
}

interface ContributionData {
  name?: string;
  cls?: string;
  amount?: number;
  date?: string;
}

export default function FeeBreakdown() {
  const { settings } = useFundStore();
  const [investorFees, setInvestorFees] = useState<InvestorFee[]>([]);
  const [totalFees, setTotalFees] = useState(0);

  useEffect(() => {
    const calculateFees = () => {
      const investorData = (window as { getInvestorData?: () => ContributionData[] }).getInvestorData?.() || [];

      if (investorData.length === 0) {
        setInvestorFees([]);
        setTotalFees(0);
        return;
      }

      const windowStart = new Date(settings.winStart);
      const windowEnd = new Date(settings.winEnd);

      // Group contributions by investor
      const investorGroups: { [key: string]: ContributionData[] } = {};

      investorData.forEach((contrib: ContributionData) => {
        const key = `${contrib.name || 'Unknown'}_${contrib.cls || 'investor'}`;
        if (!investorGroups[key]) {
          investorGroups[key] = [];
        }
        investorGroups[key].push(contrib);
      });

      const feeResults: InvestorFee[] = [];
      let totalDollarDays = 0;

      // Calculate dollar-days for each investor
      Object.values(investorGroups).forEach(contributions => {
        if (contributions.length === 0) return;

        let dollarDays = 0;

        contributions.forEach(contrib => {
          const contribDate = new Date(contrib.date);
          if (contribDate >= windowStart && contribDate <= windowEnd) {
            const daysInWindow = Math.max(0, Math.ceil((windowEnd.getTime() - contribDate.getTime()) / (1000 * 60 * 60 * 24)));
            dollarDays += (Number(contrib.amount) || 0) * daysInWindow;
          }
        });

        totalDollarDays += dollarDays;
      });

      // Calculate fees for each investor
      Object.values(investorGroups).forEach(contributions => {
        if (contributions.length === 0) return;

        const investor = contributions[0];
        let dollarDays = 0;

        contributions.forEach(contrib => {
          const contribDate = new Date(contrib.date);
          if (contribDate >= windowStart && contribDate <= windowEnd) {
            const daysInWindow = Math.max(0, Math.ceil((windowEnd.getTime() - contribDate.getTime()) / (1000 * 60 * 60 * 24)));
            dollarDays += (Number(contrib.amount) || 0) * daysInWindow;
          }
        });

        // Only calculate fees for investors, not founders
        if (investor.cls === 'investor') {
          const twShare = totalDollarDays > 0 ? (dollarDays / totalDollarDays) : 0;
          const baseProfitShare = twShare * settings.realizedProfit;
          const feeRate = settings.mgmtFeePct / 100;
          const feeAmount = baseProfitShare * feeRate;

          feeResults.push({
            name: investor.name || 'Unknown',
            baseProfitShare: baseProfitShare,
            feeRate: settings.mgmtFeePct,
            feeAmount: feeAmount
          });
        }
      });

      const totalFeeAmount = feeResults.reduce((sum, fee) => sum + fee.feeAmount, 0);

      setInvestorFees(feeResults);
      setTotalFees(totalFeeAmount);
    };

    calculateFees();
  }, [settings.winStart, settings.winEnd, settings.realizedProfit, settings.mgmtFeePct]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="panel">
      <h2>Fee Breakdown — Investors (base profit only)</h2>
      <div className="small">
        Management fees collected on base profit share at {settings.mgmtFeePct}% rate
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Investor</th>
              <th className="right">Base profit share</th>
              <th className="right">Fee rate</th>
              <th className="right">Fee amount</th>
            </tr>
          </thead>
          <tbody>
            {investorFees.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No investor fee data available. Add investors in the table above to see fee breakdown.
                </td>
              </tr>
            ) : (
              investorFees.map((fee, index) => (
                <tr key={index}>
                  <td><strong>{fee.name}</strong></td>
                  <td className="right">{formatCurrency(fee.baseProfitShare)}</td>
                  <td className="right">{fee.feeRate.toFixed(1)}%</td>
                  <td className="right"><strong>{formatCurrency(fee.feeAmount)}</strong></td>
                </tr>
              ))
            )}
            {investorFees.length > 0 && (
              <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold' }}>
                <td>TOTAL FEES</td>
                <td className="right">-</td>
                <td className="right">-</td>
                <td className="right"><strong>{formatCurrency(totalFees)}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="small" id="feeNotes">
        {totalFees > 0 && (
          <>
            Total management fees: {formatCurrency(totalFees)} |
            Fee rate: {settings.mgmtFeePct}% of base profit share |
            Fees paid to founders
          </>
        )}
      </div>
    </div>
  );
}
