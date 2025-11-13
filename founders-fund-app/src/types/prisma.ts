/**
 * Type mappings and utilities for Prisma integration
 * Maps between application types and Prisma-generated types
 */

import { Prisma } from '@prisma/client';
import { CashflowLeg, LegType, Owner } from './allocation';

// Re-export Prisma types for convenience
export type {
  Portfolio,
  Contribution,
  Snapshot,
  LegType,
} from '@prisma/client';

// Type alias for compatibility
export type PrismaLegType = LegType;

/**
 * Utility type for Portfolio with relations
 */
export type PortfolioWithRelations = Prisma.PortfolioGetPayload<{
  include: {
    contributions: true;
    snapshots: true;
  };
}>;

/**
 * Utility type for Contribution creation
 */
export type ContributionCreateInput = Prisma.ContributionCreateInput;

/**
 * Utility type for Snapshot creation
 */
export type SnapshotCreateInput = Prisma.SnapshotCreateInput;

/**
 * Maps application CashflowLeg to Prisma Contribution for database storage
 */
export function cashflowLegToContribution(
  leg: CashflowLeg
): Omit<ContributionCreateInput, 'portfolio'> {
  return {
    owner: leg.owner,
    name: leg.name,
    type: leg.type as PrismaLegType,
    amount: leg.amount,
    ts: new Date(leg.ts),
    earnsDollarDaysThisWindow: leg.earnsDollarDaysThisWindow,
  };
}

/**
 * Maps Prisma Contribution to application CashflowLeg
 */
export function contributionToCashflowLeg(contribution: {
  id: string;
  owner: string;
  name: string;
  type: string;
  amount: Prisma.Decimal | number;
  ts: Date;
  earnsDollarDaysThisWindow: boolean;
}): CashflowLeg {
  return {
    id: contribution.id,
    owner: contribution.owner as Owner,
    name: contribution.name,
    type: contribution.type as LegType,
    amount: typeof contribution.amount === 'number' ? contribution.amount : Number(contribution.amount),
    ts: contribution.ts.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
    earnsDollarDaysThisWindow: contribution.earnsDollarDaysThisWindow,
  };
}