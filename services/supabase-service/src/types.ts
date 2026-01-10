/**
 * Database Service Types
 * Common types and interfaces used across database services
 */

export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface DatabaseListResponse<T> extends DatabaseResponse<T[]> {
  count?: number;
}

export interface DatabaseOperation {
  success: boolean;
  error: Error | null;
}

export interface DatabaseBulkOperation extends DatabaseOperation {
  results: any[];
}

// Re-export table service types
export type { TableRecord, TableFilter, TableQuery, CreateTableOptions } from './services/tables-service';

// Re-export secrets service types
export type { SecretValue, SecretMetadata, CreateSecretOptions } from './services/secrets-service';

// Common error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class TableNotFoundError extends DatabaseError {
  constructor(tableName: string) {
    super(`Table '${tableName}' not found`, 'TABLE_NOT_FOUND', { tableName });
    this.name = 'TableNotFoundError';
  }
}

export class SecretNotFoundError extends DatabaseError {
  constructor(secretName: string) {
    super(`Secret '${secretName}' not found`, 'SECRET_NOT_FOUND', { secretName });
    this.name = 'SecretNotFoundError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

// Utility types
export type SortDirection = 'asc' | 'desc';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  column: string;
  direction?: SortDirection;
}

export interface QueryOptions extends PaginationOptions {
  sort?: SortOptions[];
  select?: string[];
}

// Database configuration
export interface DatabaseConfig {
  url: string;
  key: string;
  schema?: string;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
  retry?: {
    attempts?: number;
    delay?: number;
  };
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: string;
  checks: {
    database: boolean;
    secrets: boolean;
    auth: boolean;
  };
  performance?: {
    responseTime: number;
    memoryUsage?: number;
  };
}

// Audit types for tracking changes
export interface AuditLog {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id?: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}
