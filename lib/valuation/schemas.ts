/**
 * Zod validation schemas for 409.ai Valuation Service (AI Appraisal)
 * Following enterprise security standards - validate all inputs
 */

import { z } from 'zod';

// User validation schemas
export const createValuationUserSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
});

// Company info validation schemas
export const companyInfoSchema = z.object({
  legalName: z.string().min(1, 'Company legal name is required').max(200).trim(),
  sicCode: z.string().regex(/^\d{4}$/, 'SIC code must be 4 digits').optional(),
  revenueModel: z.enum(['SaaS', 'Services', 'Product', 'Marketplace', 'Other']).optional(),
  numberOfEmployees: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  inceptionDate: z.string().datetime().optional(),
  exitTimeline: z.string().datetime().optional(),
  lawFirm: z.string().max(200).trim().optional(),
  companyOverview: z.string().max(1000, 'Company overview must be under 1000 characters').trim().optional(),
  competitors: z.array(z.object({
    name: z.string().min(1).max(200).trim(),
    website: z.string().url('Invalid competitor website URL').optional(),
  })).max(10, 'Maximum 10 competitors allowed').optional(),
  serviceCountries: z.array(z.string().length(2, 'Use ISO 2-letter country codes')).optional(),
  accountingSoftware: z.enum([
    'QuickBooks', 
    'NetSuite', 
    'FreshBooks', 
    'Xero', 
    'Wave', 
    'Other', 
    'None'
  ]).optional(),
});

// Cap table info validation
export const capTableInfoSchema = z.object({
  hasLiquidityPreference: z.boolean().optional(),
  liquidityPreferenceDetails: z.string().max(500).trim().optional(),
  hasConvertibleNotes: z.boolean().optional(),
  convertibleNotesDetails: z.string().max(500).trim().optional(),
  hasSpecialRights: z.boolean().optional(),
  specialRightsDetails: z.string().max(500).trim().optional(),
});

// Report contact validation
export const reportContactSchema = z.object({
  name: z.string().min(1, 'Contact name is required').max(200).trim(),
  title: z.string().min(1, 'Contact title is required').max(100).trim(),
  email: z.string().email('Invalid contact email').toLowerCase().trim(),
});

// Create valuation request validation
export const createValuationRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  companyInfo: companyInfoSchema.partial().optional(),
});

// Update valuation request validation
export const updateValuationRequestSchema = z.object({
  companyInfo: companyInfoSchema.partial().optional(),
  capTableInfo: capTableInfoSchema.optional(),
  reportContact: reportContactSchema.optional(),
  hasPrevious409A: z.boolean().optional(),
});

// File upload validation
export const uploadAttachmentSchema = z.object({
  attachmentType: z.enum([
    'articles_of_incorporation',
    'pitch_deck',
    'cap_table',
    'financial_statements',
    'other'
  ]),
  fileSize: z.number().max(50 * 1024 * 1024, 'File size must be under 50MB'),
  fileName: z.string().regex(/^[\w\-. ]+$/, 'Invalid file name'),
  mimeType: z.string().regex(/^[\w\-+.]+\/[\w\-+.]+$/, 'Invalid MIME type'),
});

// API authentication validation
export const authTokenSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
});

// Session token validation
export const sessionTokenSchema = z.object({
  token: z.string().min(1),
  loginUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});

// Valuation ID validation
export const valuationIdSchema = z.string().uuid('Invalid valuation ID format');

// User ID validation
export const userIdSchema = z.string().uuid('Invalid user ID format');

// Environment variable validation
export const valuationEnvSchema = z.object({
  VALUATION_409AI_CLIENT_ID: z.string().min(1, 'Client ID is required'),
  VALUATION_409AI_CLIENT_SECRET: z.string().min(1, 'Client secret is required'),
  VALUATION_409AI_API_URL: z.string().url('Invalid API URL'),
});