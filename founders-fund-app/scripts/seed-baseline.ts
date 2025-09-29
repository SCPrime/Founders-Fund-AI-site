#!/usr/bin/env -S npx tsx
// Baseline seeder for July-August Figment Splits investor deposits
// This script is idempotent and can be run multiple times safely

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASELINE_PORTFOLIO_ID = 'baseline-figment-splits-2024';

// July-August Figment Splits baseline data
const baselineContributions = [
  // Laura's $50,000 investment on July 15, 2024
  {
    owner: 'investor',
    name: 'Laura',
    type: 'investor_contribution' as const,
    amount: 50000,
    ts: new Date('2024-07-15T09:00:00Z'),
    earnsDollarDaysThisWindow: true,
  },

  // Damon's $25,000 investment on August 1, 2024
  {
    owner: 'investor',
    name: 'Damon',
    type: 'investor_contribution' as const,
    amount: 25000,
    ts: new Date('2024-08-01T10:00:00Z'),
    earnsDollarDaysThisWindow: true,
  },

  // Founders 10% entry fee on Laura's contribution
  {
    owner: 'founders',
    name: 'Founders',
    type: 'founders_entry_fee' as const,
    amount: 5000, // 10% of $50,000
    ts: new Date('2024-07-15T09:01:00Z'),
    earnsDollarDaysThisWindow: true,
  },

  // Founders 10% entry fee on Damon's contribution
  {
    owner: 'founders',
    name: 'Founders',
    type: 'founders_entry_fee' as const,
    amount: 2500, // 10% of $25,000
    ts: new Date('2024-08-01T10:01:00Z'),
    earnsDollarDaysThisWindow: true,
  },
];

async function seedBaseline() {
  console.log('🌱 Starting baseline seeding for Figment Splits July-August data...');

  try {
    // Check if baseline portfolio exists
    let portfolio = await prisma.portfolio.findUnique({
      where: { id: BASELINE_PORTFOLIO_ID },
    });

    if (!portfolio) {
      console.log('📁 Creating baseline portfolio...');
      portfolio = await prisma.portfolio.create({
        data: {
          id: BASELINE_PORTFOLIO_ID,
          name: 'Figment Splits Baseline (July-August 2024)',
          totalValue: 82500, // $75k invested + $7.5k fees
          targetReturn: 0.20, // 20% target return
        },
      });
      console.log(`✅ Created portfolio: ${portfolio.name}`);
    } else {
      console.log(`📁 Using existing portfolio: ${portfolio.name}`);
    }

    // Check existing contributions to avoid duplicates
    const existingContributions = await prisma.contribution.findMany({
      where: { portfolioId: portfolio.id },
    });

    console.log(`📊 Found ${existingContributions.length} existing contributions`);

    // Seed contributions (idempotent)
    let addedCount = 0;
    for (const contrib of baselineContributions) {
      // Check if this contribution already exists
      const existing = existingContributions.find(
        (e) =>
          e.owner === contrib.owner &&
          e.name === contrib.name &&
          e.type === contrib.type &&
          e.amount.toString() === contrib.amount.toString() &&
          Math.abs(e.ts.getTime() - contrib.ts.getTime()) < 60000 // within 1 minute
      );

      if (!existing) {
        await prisma.contribution.create({
          data: {
            portfolioId: portfolio.id,
            ...contrib,
          },
        });
        console.log(`💰 Added: ${contrib.name} ${contrib.type} $${contrib.amount.toLocaleString()}`);
        addedCount++;
      } else {
        console.log(`⏭️  Skipped existing: ${contrib.name} ${contrib.type} $${contrib.amount.toLocaleString()}`);
      }
    }

    // Summary
    const totalContributions = await prisma.contribution.count({
      where: { portfolioId: portfolio.id },
    });

    console.log('\n📈 Baseline seeding complete!');
    console.log(`   Portfolio: ${portfolio.name}`);
    console.log(`   Total contributions: ${totalContributions}`);
    console.log(`   Newly added: ${addedCount}`);
    console.log(`   Portfolio ID: ${portfolio.id}`);

    // Verify totals
    const contributionSums = await prisma.contribution.groupBy({
      by: ['owner', 'type'],
      where: { portfolioId: portfolio.id },
      _sum: { amount: true },
    });

    console.log('\n💹 Contribution breakdown:');
    contributionSums.forEach((sum) => {
      console.log(`   ${sum.owner} ${sum.type}: $${Number(sum._sum.amount).toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ Baseline seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
export { BASELINE_PORTFOLIO_ID, baselineContributions };

// Run if called directly
if (require.main === module) {
  seedBaseline()
    .then(() => {
      console.log('✅ Baseline seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Baseline seeding failed:', error);
      process.exit(1);
    });
}