'use client';

import { useFundStore } from '@/store/fundStore';
import { useEffect, useState } from 'react';

interface FeeByClass {
  name: string;
  cls: string;
  baseProfitShare: number;
  mgmtFeeRole: 'Pays' | 'Receives' | 'N/A';
  mgmtFeeRate: number;
  mgmtFeeAmount: number;
  entryFeesThisWindow: number;
}

export default function FeesByClass() {
  const { settings } = useFundStore();
  const [feesByClass, setFeesByClass] = useState<FeeByClass[]>([]);

  useEffect(() => {
    const calculateFeesByClass = () => {
      const investorData = (window as any).getInvestorData?.() || [];

      if (investorData.length === 0) {
        setFeesByClass([]);
        return;
      }

      const windowStart = new Date(settings.winStart);
      const windowEnd = new Date(settings.winEnd);

      // Group contributions by investor/founder
      const participantGroups: { [key: string]: Record<string, unknown>[] } = {};

      investorData.forEach((contrib: Record<string, unknown>) => {
        const key = `${contrib.name || 'Unknown'}_${contrib.cls || 'investor'}`;
        if (!participantGroups[key]) {
          participantGroups[key] = [];
        }
        participantGroups[key].push(contrib);
      });

      const results: FeeByClass[] = [];
      let totalDollarDays = 0;

      // Calculate dollar-days for each participant
      Object.values(participantGroups).forEach(contributions => {
        if (contributions.length === 0) return;

        let dollarDays = 0;
        contributions.forEach(contrib => {
          if (!contrib.date) return;
          const contribDate = new Date(contrib.date as string);
          if (contribDate >= windowStart && contribDate <= windowEnd) {
            const daysInWindow = Math.max(0, Math.ceil((windowEnd.getTime() - contribDate.getTime()) / (1000 * 60 * 60 * 24)));
            dollarDays += (Number(contrib.amount) || 0) * daysInWindow;
          }
        });

        totalDollarDays += dollarDays;
      });

      // Calculate fees for each participant
      Object.values(participantGroups).forEach(contributions => {
        if (contributions.length === 0) return;

        const participant = contributions[0];
        let dollarDays = 0;
        let entryFeesInWindow = 0;

        contributions.forEach(contrib => {
          if (!contrib.date) return;
          const contribDate = new Date(contrib.date as string);
          const contribAmount = Number(contrib.amount) || 0;

          if (contribDate >= windowStart && contribDate <= windowEnd) {
            const daysInWindow = Math.max(0, Math.ceil((windowEnd.getTime() - contribDate.getTime()) / (1000 * 60 * 60 * 24)));
            dollarDays += contribAmount * daysInWindow;

            // Entry fees for contributions in window
            entryFeesInWindow += contribAmount * (settings.entryFeePct / 100);
          }
        });

        const twShare = totalDollarDays > 0 ? (dollarDays / totalDollarDays) : 0;
        const baseProfitShare = twShare * settings.realizedProfit;

        let mgmtFeeRole: 'Pays' | 'Receives' | 'N/A' = 'N/A';
        let mgmtFeeAmount = 0;

        if (participant.cls === 'investor') {
          mgmtFeeRole = 'Pays';
          mgmtFeeAmount = -baseProfitShare * (settings.mgmtFeePct / 100); // Negative for payments
        } else if (participant.cls === 'founder') {
          mgmtFeeRole = 'Receives';
          // Founders receive a share of all management fees paid by investors
          const totalInvestorFees = Object.values(participantGroups)
            .filter(contribs => contribs[0]?.cls === 'investor')
            .reduce((sum, contribs) => {
              let investorDollarDays = 0;
              contribs.forEach(contrib => {
                if (!contrib.date) return;
                const contribDate = new Date(contrib.date as string);
                if (contribDate >= windowStart && contribDate <= windowEnd) {
                  const daysInWindow = Math.max(0, Math.ceil((windowEnd.getTime() - contribDate.getTime()) / (1000 * 60 * 60 * 24)));
                  investorDollarDays += (Number(contrib.amount) || 0) * daysInWindow;
                }
              });
              const investorTwShare = totalDollarDays > 0 ? (investorDollarDays / totalDollarDays) : 0;
              const investorBaseProfitShare = investorTwShare * settings.realizedProfit;
              return sum + (investorBaseProfitShare * (settings.mgmtFeePct / 100));
            }, 0);

          // Distribute total management fees among founders
          const founderCount = Object.values(participantGroups).filter(contribs => contribs[0]?.cls === 'founder').length || settings.founderCount;
          mgmtFeeAmount = totalInvestorFees / Math.max(1, founderCount);
        }

        // Entry fees handling
        let adjustedEntryFees = 0;
        if (participant.cls === 'investor') {
          adjustedEntryFees = -entryFeesInWindow; // Negative for investors (they pay)
        } else if (participant.cls === 'founder') {
          // Founders receive entry fees proportionally
          const totalEntryFees = Object.values(participantGroups)
            .filter(contribs => contribs[0]?.cls === 'investor')
            .reduce((sum, contribs) => {
              let fees = 0;
              contribs.forEach(contrib => {
                if (!contrib.date) return;
                const contribDate = new Date(contrib.date as string);
                if (contribDate >= windowStart && contribDate <= windowEnd) {
                  fees += (Number(contrib.amount) || 0) * (settings.entryFeePct / 100);
                }
              });
              return sum + fees;
            }, 0);

          const founderCount = Object.values(participantGroups).filter(contribs => contribs[0]?.cls === 'founder').length || settings.founderCount;
          adjustedEntryFees = totalEntryFees / Math.max(1, founderCount);
        }

        results.push({
          name: (participant.name as string) || 'Unknown',
          cls: (participant.cls as string) || 'investor',
          baseProfitShare: baseProfitShare,
          mgmtFeeRole: mgmtFeeRole,
          mgmtFeeRate: settings.mgmtFeePct,
          mgmtFeeAmount: mgmtFeeAmount,
          entryFeesThisWindow: adjustedEntryFees
        });
      });

      setFeesByClass(results);
    };

    calculateFeesByClass();
  }, [settings.winStart, settings.winEnd, settings.realizedProfit, settings.mgmtFeePct, settings.entryFeePct, settings.founderCount]);

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
      <h2>Fees by Class — Founders & Investors</h2>
      <div className="small">
        Management fees: {settings.mgmtFeePct}% on investor base profit shares | Entry fees: {settings.entryFeePct}% on contributions
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Class / Name</th>
              <th className="right">Base profit share</th>
              <th className="right">Mgmt fee role</th>
              <th className="right">Mgmt fee rate</th>
              <th className="right">Mgmt fee amount (±)</th>
              <th className="right">Entry fees this window (±)</th>
            </tr>
          </thead>
          <tbody>
            {feesByClass.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No fee class data available. Add participants in the table above to see fee breakdown by class.
                </td>
              </tr>
            ) : (
              feesByClass.map((fee, index) => (
                <tr key={index} className={fee.cls === 'founder' ? 'founder-row' : 'investor-row'}>
                  <td>
                    <strong>{fee.name}</strong>
                    <br />
                    <span className="small" style={{ textTransform: 'capitalize' }}>{fee.cls}</span>
                  </td>
                  <td className="right">{formatCurrency(fee.baseProfitShare)}</td>
                  <td className="right">
                    <span style={{
                      color: fee.mgmtFeeRole === 'Pays' ? '#f44336' : fee.mgmtFeeRole === 'Receives' ? '#4caf50' : '#666'
                    }}>
                      {fee.mgmtFeeRole}
                    </span>
                  </td>
                  <td className="right">
                    {fee.mgmtFeeRole !== 'N/A' ? `${fee.mgmtFeeRate.toFixed(1)}%` : '-'}
                  </td>
                  <td className="right">
                    <span style={{
                      color: fee.mgmtFeeAmount > 0 ? '#4caf50' : fee.mgmtFeeAmount < 0 ? '#f44336' : '#666'
                    }}>
                      {fee.mgmtFeeAmount !== 0 ? formatCurrency(fee.mgmtFeeAmount) : '-'}
                    </span>
                  </td>
                  <td className="right">
                    <span style={{
                      color: fee.entryFeesThisWindow > 0 ? '#4caf50' : fee.entryFeesThisWindow < 0 ? '#f44336' : '#666'
                    }}>
                      {fee.entryFeesThisWindow !== 0 ? formatCurrency(fee.entryFeesThisWindow) : '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="small">
        Founders receive investor fees; investors pay {settings.mgmtFeePct}% of positive base shares; no fee on moonbag.
        {feesByClass.length > 0 && (
          <>
            <br />
            Green (+) indicates fees received, Red (-) indicates fees paid.
          </>
        )}
      </div>
    </div>
  );
}
