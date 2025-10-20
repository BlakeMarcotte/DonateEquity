/**
 * Type definitions for 409.ai Valuation Service (AI Appraisal)
 * These types are based on the 409.ai API documentation
 * No any types allowed - using strict TypeScript
 */

// Authentication types
export interface ValuationAuthToken {
  token: string;
  expiresAt: string;
}

export interface ValuationSessionToken {
  token: string;
  loginUrl: string;
  expiresAt: string;
}

// User types
export interface ValuationUser {
  user_uuid: string; // 409ai uses user_uuid instead of id
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  partner?: {
    name: string;
    subdomain: string;
  };
  valuations?: unknown[];
}

export interface CreateValuationUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

// Company information types
export interface CompanyInfo {
  legalName: string;
  sicCode?: string;
  revenueModel?: 'SaaS' | 'Services' | 'Product' | 'Marketplace' | 'Other';
  numberOfEmployees?: '1-10' | '11-50' | '51-200' | '201-500' | '500+';
  inceptionDate?: string; // ISO date
  exitTimeline?: string; // ISO date
  lawFirm?: string;
  companyOverview?: string;
  competitors?: Array<{
    name: string;
    website?: string;
  }>;
  serviceCountries?: string[];
  accountingSoftware?: 'QuickBooks' | 'NetSuite' | 'FreshBooks' | 'Xero' | 'Wave' | 'Other' | 'None';
}

// Valuation types
export interface Valuation {
  valuation_uuid: string;
  user_uuid: string;
  state: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  valuation_amount?: number;
  valuation_date?: string;
  currency?: string;
  report_url?: string;
}

export interface CreateValuationRequest {
  userId: string;
  companyInfo?: Partial<CompanyInfo>;
}

export interface UpdateValuationRequest {
  companyInfo?: Partial<CompanyInfo>;
  capTableInfo?: {
    hasLiquidityPreference?: boolean;
    liquidityPreferenceDetails?: string;
    hasConvertibleNotes?: boolean;
    convertibleNotesDetails?: string;
    hasSpecialRights?: boolean;
    specialRightsDetails?: string;
  };
  reportContact?: {
    name: string;
    title: string;
    email: string;
  };
  hasPrevious409A?: boolean;
}

// Attachment types
export interface ValuationAttachment {
  id: string;
  valuationId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface UploadAttachmentRequest {
  file: File;
  attachmentType: 'articles_of_incorporation' | 'pitch_deck' | 'cap_table' | 'financial_statements' | 'other';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Error types
export interface ValuationApiError extends Error {
  code: 'AUTH_FAILED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'SERVER_ERROR';
  statusCode: number;
  details?: unknown;
  responseBody?: string;
}

// Service configuration
export interface ValuationServiceConfig {
  clientId: string;
  clientSecret: string;
  apiUrl: string;
  timeout?: number;
}