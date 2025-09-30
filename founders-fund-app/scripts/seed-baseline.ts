#!/usr/bin/env -S npx tsx
// Idempotent baseline seeder for July–August Figment Splits deposits.
// Seeds investor contributions (Laura/Damon) + 10% entry fee to Founders.
// Uses BASELINE_PORTFOLIO_ID to tag rows so API can scope baseline cleanly.

import { prisma } from '../src/lib/prisma';
import { BASELINE_PORTFOLIO_ID, ENTRY_FEE_RATE, BASELINE_WINDOW } from '../src/lib/constants';

type Deposit = { name: string; ts: string; gross: number; };

const investorDeposits: Deposit[] = [
  { name: 'Laura', ts: '2024-07-15', gross: 50000 },
  { name: 'Damon', ts: '2024-08-01', gross: 25000 },
];

function withinBaseline(ts: Date) {
  const start = new Date(`${BASELINE_WINDOW.start}T00:00:00Z`);
  const end   = new Date(`${BASELINE_WINDOW.end}T23:59:59Z`);
  return ts >= start && ts <= end;
}

async function main() {
  // Ensure baseline portfolio exists
  await prisma.portfolio.upsert({
    where: { id: BASELINE_PORTFOLIO_ID },
    update: {},
    create: {
      id: BASELINE_PORTFOLIO_ID,
      name: 'Baseline: Figment Splits Jul-Aug 2024',
    },
  });

  let created = 0;
  for (const row of investorDeposits) {
    const ts = new Date(`${row.ts}T00:00:00Z`);
    if (!withinBaseline(ts)) continue;

    const fee = +(row.gross * ENTRY_FEE_RATE).toFixed(2);

    // Idempotent: check investor row
    const inv = await prisma.contribution.findFirst({
      where: {
        portfolioId: BASELINE_PORTFOLIO_ID,
        owner: 'investor',
        name: row.name,
        type: 'investor_contribution',
        amount: row.gross,
        ts,
      },
    });
    if (!inv) {
      await prisma.contribution.create({
        data: {
          portfolioId: BASELINE_PORTFOLIO_ID,
          owner: 'investor',
          name: row.name,
          type: 'investor_contribution',
          amount: row.gross,
          ts,
          earnsDollarDaysThisWindow: true,
        },
      });
      created++;
    }

    // Idempotent: check founders entry fee row
    const feeRow = await prisma.contribution.findFirst({
      where: {
        portfolioId: BASELINE_PORTFOLIO_ID,
        owner: 'founders',
        name: 'Founders',
        type: 'founders_entry_fee',
        amount: fee,
        ts,
      },
    });
    if (!feeRow) {
      await prisma.contribution.create({
        data: {
          portfolioId: BASELINE_PORTFOLIO_ID,
          owner: 'founders',
          name: 'Founders',
          type: 'founders_entry_fee',
          amount: fee,
          ts,
          earnsDollarDaysThisWindow: true,
        },
      });
      created++;
    }
  }
  console.log(`Baseline seed complete. New rows created: ${created}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });