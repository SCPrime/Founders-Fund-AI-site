/**
 * Monitoring and Error Tracking Utilities
 */

interface ErrorLog {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
  url?: string;
}

// In-memory error log (for production, use external service like Sentry)
const errorLogs: ErrorLog[] = [];
const MAX_ERROR_LOGS = 1000;

/**
 * Log an error for monitoring
 */
export function logError(error: Error | string, context?: Record<string, any>): void {
  const errorLog: ErrorLog = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  };

  errorLogs.push(errorLog);

  // Keep only recent errors
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs.shift();
  }

  // In production, send to external service (e.g., Sentry)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with Sentry or similar service
    console.error('Error logged:', errorLog);
  } else {
    console.error('Error logged:', errorLog);
  }
}

/**
 * Get recent error logs
 */
export function getErrorLogs(limit = 50): ErrorLog[] {
  return errorLogs.slice(-limit).reverse();
}

/**
 * Clear error logs
 */
export function clearErrorLogs(): void {
  errorLogs.length = 0;
}

/**
 * Performance monitoring
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 500;

export function logPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, any>,
): void {
  performanceMetrics.push({
    name,
    duration,
    timestamp: new Date().toISOString(),
    metadata,
  });

  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }
}

export function getPerformanceMetrics(limit = 100): PerformanceMetric[] {
  return performanceMetrics.slice(-limit).reverse();
}

/**
 * Performance timer decorator
 */
export async function measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logPerformance(name, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logPerformance(name, duration, { error: true });
    throw error;
  }
}
