/**
 * Database Service Index
 *
 * Main entry point for the database service.
 * Exports all services, types, and utilities.
 */

// Supabase client
export { supabase } from './supabaseClient';

// Main service
export { DatabaseService, db } from './database-service';

// Individual services
export { TablesService } from './services/tables-service';
export { SecretsService } from './services/secrets-service';

// Types
export type {
  // Response types
  DatabaseResponse,
  DatabaseListResponse,
  DatabaseOperation,
  DatabaseBulkOperation,

  // Configuration types
  DatabaseConfig,
  HealthCheckResponse,
  AuditLog,

  // Utility types
  SortDirection,
  PaginationOptions,
  SortOptions,
  QueryOptions,

  // Table service types
  TableRecord,
  TableFilter,
  TableQuery,
  CreateTableOptions,

  // Secrets service types
  SecretValue,
  SecretMetadata,
  CreateSecretOptions,

  // Error types
  DatabaseError,
  TableNotFoundError,
  SecretNotFoundError,
  ValidationError,
} from './types';

// Utilities
export {
  buildQueryFromParams,
  validateTableName,
  validateColumnName,
  sanitizeString,
  generatePaginationMeta,
  convertSortOptions,
  buildSelectString,
  generateCacheKey,
  retryWithBackoff,
  deepMerge,
  parseTimestamps,
  formatDatabaseError,
} from './utils';

// Setup and configuration
export { REQUIRED_RPC_FUNCTIONS, SETUP_SCRIPT, GRANT_PERMISSIONS, RLS_POLICIES, SETUP_INSTRUCTIONS, CHECK_FUNCTIONS_SCRIPT } from './setup';
