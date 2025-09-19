'use client';

import { useCalculator } from '@/context/CalculatorContext';
import { useEffect, useState } from 'react';

interface InvestorEntryFee {
  name: string;
  preStartFees: number;
  inWindowFees: number;
  totalFees: number;
}

export default function EntryFeeBreakdown() {
  const calc = useCalculator();
  const [entryFees, setEntryFees] = useState<InvestorEntryFee[]>([]);
  const [totalEntryFees, setTotalEntryFees] = useState(0);

  useEffect(() => {
    const calculateEntryFees = () => {
      const investorData = (window as any).getInvestorData?.() || [];

      if (investorData.length === 0) {
        setEntryFees([]);
        setTotalEntryFees(0);
        return;
      }

      const windowStart = new Date(calc.winStart);
      const entryFeeRate = calc.entryFeePct / 100;

      // Group contributions by investor
      const investorGroups: { [key: string]: any[] } = {};

      investorData.forEach((contrib: any) => {
        const key = `${contrib.name || 'Unknown'}_${contrib.cls || 'investor'}`;
        if (!investorGroups[key]) {
          investorGroups[key] = [];
        }
        investorGroups[key].push(contrib);
      });

      const entryFeeResults: InvestorEntryFee[] = [];

      // Calculate entry fees for each investor
      Object.values(investorGroups).forEach(contributions => {
        if (contributions.length === 0) return;

        const investor = contributions[0];
        let preStartFees = 0;
        let inWindowFees = 0;

        contributions.forEach(contrib => {
          const contribDate = new Date(contrib.date);
          const contribAmount = Number(contrib.amount) || 0;
          const entryFee = contribAmount * entryFeeRate;

          if (contribDate < windowStart) {
            preStartFees += entryFee;
          } else {
            inWindowFees += entryFee;
          }
        });

        const totalFees = preStartFees + inWindowFees;

        if (totalFees > 0) {
          entryFeeResults.push({
            name: investor.name || 'Unknown',
            preStartFees: preStartFees,
            inWindowFees: inWindowFees,
            totalFees: totalFees
          });
        }
      });

      const totalAmount = entryFeeResults.reduce((sum, fee) => sum + fee.totalFees, 0);

      setEntryFees(entryFeeResults);
      setTotalEntryFees(totalAmount);
    };

    calculateEntryFees();
  }, [calc.winStart, calc.entryFeePct]);

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
      <h2>Entry Fee Breakdown — Routed to Founders ({calc.entryFeePct}%)</h2>
      <div className="small">
        Entry fees charged on investor contributions at {calc.entryFeePct}% rate, paid to founders
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Investor</th>
              <th className="right">Entry fees — Pre-start</th>
              <th className="right">Entry fees — In window</th>
              <th className="right">Total entry fees</th>
            </tr>
          </thead>
          <tbody>
            {entryFees.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No entry fee data available. Add investors in the table above to see entry fee breakdown.
                </td>
              </tr>
            ) : (
              entryFees.map((fee, index) => (
                <tr key={index}>
                  <td><strong>{fee.name}</strong></td>
                  <td className="right">{formatCurrency(fee.preStartFees)}</td>
                  <td className="right">{formatCurrency(fee.inWindowFees)}</td>
                  <td className="right"><strong>{formatCurrency(fee.totalFees)}</strong></td>
                </tr>
              ))
            )}
            {entryFees.length > 0 && (
              <tr style={{ borderTop: '2px solid #333', fontWeight: 'bold' }}>
                <td>TOTAL ENTRY FEES</td>
                <td className="right">
                  {formatCurrency(entryFees.reduce((sum, fee) => sum + fee.preStartFees, 0))}
                </td>
                <td className="right">
                  {formatCurrency(entryFees.reduce((sum, fee) => sum + fee.inWindowFees, 0))}
                </td>
                <td className="right"><strong>{formatCurrency(totalEntryFees)}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="small">
        {totalEntryFees > 0 && (
          <>
            Total entry fees collected: {formatCurrency(totalEntryFees)} |
            Entry fee rate: {calc.entryFeePct}% of contributions |
            {calc.feeReducesInvestor === 'yes' ? 'Reduces investor contributions' : 'Does not reduce investor contributions'}
          </>
        )}
        {totalEntryFees === 0 && (
          <>Entry fees are capital transfers to Founders.</>
        )}
      </div>
    </div>
  );
}
