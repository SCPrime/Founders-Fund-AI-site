/**
 * Validation Types
 * Type definitions for validation errors and issues
 */

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  quickFix?: () => void;
  quickFixLabel?: string;
}

export interface ValidationSummary {
  totalContributions: number;
  totalNetProfit: number;
  totalDollarDays: number;
}

export interface ValidationState {
  issues: ValidationIssue[];
  summary: ValidationSummary | null;
  lastCalculated: Date | null;
  isCalculating: boolean;
}