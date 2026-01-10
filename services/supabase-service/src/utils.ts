import type { TableFilter, TableQuery } from './services/tables-service';
import type { SortOptions } from './types';

/**
 * Database Utilities
 * Helper functions for common database operations
 */

/**
 * Build query object from URL search parameters
 */
export function buildQueryFromParams(searchParams: URLSearchParams): TableQuery {
  const query: TableQuery = {};

  // Handle select fields
  const select = searchParams.get('select');
  if (select) {
    query.select = select;
  }

  // Handle filters
  const filters: TableFilter[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('filter.')) {
      const [, column, operator] = key.split('.');
      if (column && operator) {
        filters.push({
          column,
          operator: operator as TableFilter['operator'],
          value: parseFilterValue(value),
        });
      }
    }
  }
  if (filters.length > 0) {
    query.filters = filters;
  }

  // Handle ordering
  const orderBy = searchParams.get('orderBy');
  const orderDirection = searchParams.get('orderDirection');
  if (orderBy) {
    query.orderBy = {
      column: orderBy,
      ascending: orderDirection !== 'desc',
    };
  }

  // Handle pagination
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  if (limit && !isNaN(Number(limit))) {
    query.limit = Number(limit);
  }
  if (offset && !isNaN(Number(offset))) {
    query.offset = Number(offset);
  }

  return query;
}

/**
 * Parse filter value based on its type
 */
function parseFilterValue(value: string): any {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // If not valid JSON, return as string
    return value;
  }
}

/**
 * Validate table name to prevent SQL injection
 */
export function validateTableName(tableName: string): boolean {
  // Table names should only contain letters, numbers, and underscores
  const tableNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return tableNameRegex.test(tableName) && tableName.length <= 63; // PostgreSQL limit
}

/**
 * Validate column name to prevent SQL injection
 */
export function validateColumnName(columnName: string): boolean {
  // Column names should only contain letters, numbers, and underscores
  const columnNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  return columnNameRegex.test(columnName) && columnName.length <= 63; // PostgreSQL limit
}

/**
 * Sanitize string input for database operations
 */
export function sanitizeString(input: string): string {
  // Remove null bytes and control characters
  return input.replaceAll(/[\u0000-\u001F\u007F]/g, '');
}

/**
 * Generate pagination metadata
 */
export function generatePaginationMeta(
  total: number,
  page: number,
  limit: number
): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
} {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
}

/**
 * Convert sort options to Supabase order format
 */
export function convertSortOptions(sortOptions?: SortOptions[]): Array<{
  column: string;
  ascending: boolean;
}> {
  if (!sortOptions || sortOptions.length === 0) {
    return [];
  }

  return sortOptions.map((sort) => ({
    column: sort.column,
    ascending: sort.direction !== 'desc',
  }));
}

/**
 * Build select string from array of columns
 */
export function buildSelectString(columns?: string[]): string {
  if (!columns || columns.length === 0) {
    return '*';
  }

  // Validate all column names
  const validColumns = columns.filter(validateColumnName);
  if (validColumns.length !== columns.length) {
    throw new Error('Invalid column names detected');
  }

  return validColumns.join(',');
}

/**
 * Generate cache key for query results
 */
export function generateCacheKey(tableName: string, query: TableQuery): string {
  const keyParts = [tableName];

  if (query.select) {
    keyParts.push(`select:${query.select}`);
  }

  if (query.filters && query.filters.length > 0) {
    const filterKey = query.filters
      .map((f: { column: any; operator: any; value: any; }) => `${f.column}:${f.operator}:${JSON.stringify(f.value)}`)
      .sort()
      .join('|');
    keyParts.push(`filters:${filterKey}`);
  }

  if (query.orderBy) {
    keyParts.push(`order:${query.orderBy.column}:${query.orderBy.ascending ? 'asc' : 'desc'}`);
  }

  if (query.limit) {
    keyParts.push(`limit:${query.limit}`);
  }

  if (query.offset) {
    keyParts.push(`offset:${query.offset}`);
  }

  return keyParts.join('::');
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff: baseDelay * 2^(attempt-1)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Deep merge objects (useful for updating records)
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Convert database timestamps to Date objects
 */
export function parseTimestamps<T extends Record<string, any>>(record: T, timestampFields: string[] = ['created_at', 'updated_at']): T {
  const result = { ...record };

  for (const field of timestampFields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        (result as any)[field] = new Date(result[field]);
      } catch {
        // If parsing fails, keep original value
      }
    }
  }

  return result;
}

/**
 * Format error for API responses
 */
export function formatDatabaseError(error: Error): {
  code: string;
  message: string;
  details?: any;
} {
  // Handle Supabase/PostgreSQL specific errors
  if (error.message.includes('duplicate key value')) {
    return {
      code: 'DUPLICATE_KEY',
      message: 'A record with this value already exists',
    };
  }

  if (error.message.includes('violates foreign key constraint')) {
    return {
      code: 'FOREIGN_KEY_VIOLATION',
      message: 'Referenced record does not exist',
    };
  }

  if (error.message.includes('violates not-null constraint')) {
    return {
      code: 'NOT_NULL_VIOLATION',
      message: 'Required field is missing',
    };
  }

  if (error.message.includes('permission denied')) {
    return {
      code: 'PERMISSION_DENIED',
      message: 'You do not have permission to perform this operation',
    };
  }

  // Default error format
  return {
    code: 'DATABASE_ERROR',
    message: error.message,
  };
}
