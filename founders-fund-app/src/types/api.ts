/**
 * API Request and Response Types
 * Centralized type definitions for all API endpoints
 */

import {
  AllocationCalculateRequest,
  AllocationCalculateResponse
} from './allocation';

// Common API response structure (use AllocationApiResponse for allocation-related APIs)
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Calculate API - Use the enhanced types from allocation.ts
export interface CalculateRequestBody extends AllocationCalculateRequest {
  version?: string; // Optional API version
}

export interface CalculateResponse extends AllocationCalculateResponse {
  metadata?: { timestamp: string; version?: string }; // Optional response metadata
}

// OCR API types
export interface OCRRequestBody {
  image: string; // base64 encoded image
  settings?: {
    extractFounders?: boolean;
    extractInvestors?: boolean;
    extractSettings?: boolean;
  };
}

export interface OCRResponse {
  success: boolean;
  data?: {
    founders?: Array<{
      date: string;
      amount: number;
    }>;
    investors?: Array<{
      name: string;
      date: string;
      amount: number;
      rule?: string;
    }>;
    settings?: {
      walletSize?: number;
      realizedProfit?: number;
      mgmtFeePct?: number;
      entryFeePct?: number;
      moonbagUnreal?: number;
    };
    extractedText?: string;
  };
  error?: string;
}

// AI Analysis API types
export interface AnalyzeRequest {
  text: string;
  context: 'financial_document' | 'user_query' | 'prediction_analysis' | 'data_validation' | 'document_analysis';
  current_settings?: {
    walletSize: number;
    realizedProfit: number;
    mgmtFeePct: number;
    entryFeePct: number;
  };
}

export interface AnalyzeResponse {
  analysis: string;
  suggestions?: Array<{
    type: 'setting_change' | 'data_correction' | 'validation_issue';
    description: string;
    action?: string;
  }>;
  confidence?: number;
}

// PNL Extract API types
export interface PNLExtractRequest {
  image: string;
  extractType?: 'wallet_size' | 'profit_loss' | 'full_analysis';
}

export interface PNLExtractResponse {
  walletSize?: number;
  totalValue?: number;
  availableBalance?: number;
  unrealizedPnl?: number;
  extractedText?: string;
  confidence?: number;
}

// Portfolio API types (for future implementation)
export interface PortfolioData {
  totalValue: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    currentPrice: number;
    totalValue: number;
    unrealizedPnl: number;
  }>;
  cash: number;
  timestamp: string;
}

export interface PortfolioResponse extends ApiResponse<PortfolioData> {
  // Additional portfolio-specific response fields
  cacheTimestamp?: string;
}