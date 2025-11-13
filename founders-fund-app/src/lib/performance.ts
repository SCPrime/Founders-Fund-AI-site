/**
 * Performance Optimization Utilities
 *
 * Database query optimization, response compression, and performance monitoring
 */

import { Prisma } from '@prisma/client';

/**
 * Optimize Prisma queries by selecting only needed fields
 */
export function optimizeSelect<T extends Record<string, any>>(
  fields: (keyof T)[],
): Prisma.Enumerable<T> {
  return fields.reduce((acc, field) => {
    acc[field as string] = true;
    return acc;
  }, {} as any);
}

/**
 * Batch database operations for better performance
 */
export async function batchOperation<T, R>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for rate-limited operations
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[PERF] ${name} (ERROR): ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }) as T;
}

/**
 * Database query optimization helpers
 */
export const queryOptimizations = {
  /**
   * Select only essential fields for list views
   */
  minimalUserSelect: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
  },

  /**
   * Select only essential fields for portfolio list
   */
  minimalPortfolioSelect: {
    id: true,
    name: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  },

  /**
   * Select only essential fields for agent list
   */
  minimalAgentSelect: {
    id: true,
    name: true,
    symbol: true,
    status: true,
    allocation: true,
    totalPnl: true,
    totalValue: true,
    deployed: true,
  },
};
