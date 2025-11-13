/**
 * Database Query Optimization Utilities
 *
 * Provides optimized Prisma query patterns and helpers
 */

import { Prisma } from '@prisma/client';

/**
 * Select only necessary fields to reduce payload size
 */
export const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const portfolioSelect = {
  id: true,
  name: true,
  userId: true,
  totalValue: true,
  targetReturn: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PortfolioSelect;

export const agentSelect = {
  id: true,
  name: true,
  symbol: true,
  status: true,
  allocation: true,
  deployed: true,
} satisfies Prisma.AgentSelect;

/**
 * Common query options for pagination
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export function getPaginationParams(options: PaginationOptions = {}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100); // Max 100 per page
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Optimized query with select fields and pagination
 */
export function optimizedQuery<T>(
  queryFn: (args: { skip: number; take: number }) => Promise<T[]>,
  options: PaginationOptions = {},
) {
  const { skip, take } = getPaginationParams(options);
  return queryFn({ skip, take });
}

/**
 * Batch queries for better performance
 */
export async function batchQueries<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
  return Promise.all(queries.map((q) => q()));
}
