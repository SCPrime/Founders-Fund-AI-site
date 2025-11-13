import { UserRole } from '@prisma/client';
import type { AllocationOutputs } from '@/types/allocation';

/**
 * Privacy layer for role-based data filtering
 *
 * Role hierarchy:
 * - ADMIN: Full access to all data
 * - FOUNDER: Can see all portfolio data, all contributions, all allocations
 * - INVESTOR: Can only see their own contributions and allocations
 */

export interface PrivacyContext {
  userId: string;
  userRole: UserRole;
  userName: string;
}

/**
 * Filter allocation outputs based on user role
 * FOUNDERS: See everything
 * INVESTORS: See only their own data
 * ADMIN: See everything
 */
export function filterAllocationByRole(
  data: AllocationOutputs,
  context: PrivacyContext
): AllocationOutputs {
  // ADMIN and FOUNDER can see everything
  if (context.userRole === 'ADMIN' || context.userRole === 'FOUNDER') {
    return data;
  }

  // INVESTOR can only see their own data
  if (context.userRole === 'INVESTOR') {
    // Filter shares to only include investor's own share
    const filteredShares = data.shares.filter(
      (share) => share.name === context.userName
    );

    // Filter dollar-days to only include investor's own data
    const filteredDollarDays = data.dollarDays.filter(
      (dd) => dd.name === context.userName
    );

    // Filter allocation breakdown to only include investor's data
    const filteredAllocationBreakdown = data.allocationBreakdown.filter(
      (item) => item.name === context.userName
    );

    return {
      ...data,
      shares: filteredShares,
      dollarDays: filteredDollarDays,
      allocationBreakdown: filteredAllocationBreakdown,
      // Keep totals visible for context
    };
  }

  // Default: return empty data for unknown roles
  return {
    ...data,
    shares: [],
    dollarDays: [],
    allocationBreakdown: [],
  };
}

/**
 * Filter contributions based on user role
 * FOUNDERS/ADMIN: See all contributions
 * INVESTORS: See only their own contributions
 */
export function filterContributionsByRole<T extends { owner: string; name: string }>(
  contributions: T[],
  context: PrivacyContext
): T[] {
  // ADMIN and FOUNDER can see everything
  if (context.userRole === 'ADMIN' || context.userRole === 'FOUNDER') {
    return contributions;
  }

  // INVESTOR can only see their own contributions
  if (context.userRole === 'INVESTOR') {
    return contributions.filter(
      (contrib) => contrib.name === context.userName
    );
  }

  return [];
}

/**
 * Filter portfolios based on user role
 * FOUNDERS/ADMIN: See all portfolios
 * INVESTORS: See only their own portfolios
 */
export function filterPortfoliosByRole<T extends { userId?: string | null }>(
  portfolios: T[],
  context: PrivacyContext
): T[] {
  // ADMIN can see everything
  if (context.userRole === 'ADMIN') {
    return portfolios;
  }

  // FOUNDER can see all portfolios
  if (context.userRole === 'FOUNDER') {
    return portfolios;
  }

  // INVESTOR can only see their own portfolios
  if (context.userRole === 'INVESTOR') {
    return portfolios.filter((portfolio) => portfolio.userId === context.userId);
  }

  return [];
}

/**
 * Check if user has permission to access a specific portfolio
 */
export function canAccessPortfolio(
  portfolioUserId: string | null | undefined,
  context: PrivacyContext
): boolean {
  // ADMIN and FOUNDER can access any portfolio
  if (context.userRole === 'ADMIN' || context.userRole === 'FOUNDER') {
    return true;
  }

  // INVESTOR can only access their own portfolios
  if (context.userRole === 'INVESTOR') {
    return portfolioUserId === context.userId;
  }

  return false;
}

/**
 * Check if user has permission to modify a specific resource
 */
export function canModifyResource(
  resourceOwnerId: string | null | undefined,
  context: PrivacyContext
): boolean {
  // ADMIN can modify anything
  if (context.userRole === 'ADMIN') {
    return true;
  }

  // FOUNDER can modify founder-owned resources
  if (context.userRole === 'FOUNDER' && resourceOwnerId === context.userId) {
    return true;
  }

  // INVESTOR can only modify their own resources
  if (context.userRole === 'INVESTOR' && resourceOwnerId === context.userId) {
    return true;
  }

  return false;
}

/**
 * Sanitize sensitive data based on user role
 * Removes sensitive fields that the user shouldn't see
 */
export function sanitizeUserData<T extends { passwordHash?: string }>(
  user: T,
  context: PrivacyContext
): Omit<T, 'passwordHash'> {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
