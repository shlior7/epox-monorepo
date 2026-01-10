import type { SupabaseClient } from '@supabase/supabase-js';

export type TableRecord = Record<string, any>;

export interface TableFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: any;
}

export interface TableQuery {
  select?: string;
  filters?: TableFilter[];
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface CreateTableOptions {
  columns: Array<{
    name: string;
    type: string;
    primaryKey?: boolean;
    nullable?: boolean;
    defaultValue?: any;
    unique?: boolean;
  }>;
  constraints?: string[];
}

/**
 * Tables Service
 * Handles CRUD operations for Supabase tables
 */
export class TablesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all records from a table with optional filtering and pagination
   */
  async getRecords(
    tableName: string,
    query: TableQuery = {}
  ): Promise<{ data: TableRecord[] | null; error: Error | null; count?: number }> {
    try {
      let queryBuilder = this.supabase.from(tableName).select(query.select ?? '*', { count: 'exact' });

      // Apply filters
      if (query.filters && query.filters.length > 0) {
        for (const filter of query.filters) {
          switch (filter.operator) {
            case 'eq':
              queryBuilder = queryBuilder.eq(filter.column, filter.value);
              break;
            case 'neq':
              queryBuilder = queryBuilder.neq(filter.column, filter.value);
              break;
            case 'gt':
              queryBuilder = queryBuilder.gt(filter.column, filter.value);
              break;
            case 'gte':
              queryBuilder = queryBuilder.gte(filter.column, filter.value);
              break;
            case 'lt':
              queryBuilder = queryBuilder.lt(filter.column, filter.value);
              break;
            case 'lte':
              queryBuilder = queryBuilder.lte(filter.column, filter.value);
              break;
            case 'like':
              queryBuilder = queryBuilder.like(filter.column, filter.value);
              break;
            case 'ilike':
              queryBuilder = queryBuilder.ilike(filter.column, filter.value);
              break;
            case 'in':
              queryBuilder = queryBuilder.in(filter.column, filter.value);
              break;
            case 'is':
              queryBuilder = queryBuilder.is(filter.column, filter.value);
              break;
          }
        }
      }

      // Apply ordering
      if (query.orderBy) {
        queryBuilder = queryBuilder.order(query.orderBy.column, {
          ascending: query.orderBy.ascending ?? true,
        });
      }

      // Apply pagination
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }
      if (query.offset) {
        queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit ?? 1000) - 1);
      }

      const { data, error, count } = await queryBuilder;

      return {
        data,
        error: error ? new Error(error.message) : null,
        count: count ?? undefined,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get a single record by ID
   */
  async getRecord(
    tableName: string,
    id: string,
    idColumn = 'id',
    select = '*'
  ): Promise<{ data: TableRecord | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.from(tableName).select(select).eq(idColumn, id).single();

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Create a new record
   */
  async createRecord(tableName: string, record: TableRecord): Promise<{ data: TableRecord | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.from(tableName).insert(record).select().single();

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Create multiple records
   */
  async createRecords(tableName: string, records: TableRecord[]): Promise<{ data: TableRecord[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.from(tableName).insert(records).select();

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Update a record by ID
   */
  async updateRecord(
    tableName: string,
    id: string,
    updates: Partial<TableRecord>,
    idColumn = 'id'
  ): Promise<{ data: TableRecord | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.from(tableName).update(updates).eq(idColumn, id).select().single();

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Update multiple records with filters
   */
  async updateRecords(
    tableName: string,
    updates: Partial<TableRecord>,
    filters: TableFilter[]
  ): Promise<{ data: TableRecord[] | null; error: Error | null; count?: number }> {
    try {
      let queryBuilder = this.supabase.from(tableName).update(updates);

      // Apply filters
      for (const filter of filters) {
        switch (filter.operator) {
          case 'eq':
            queryBuilder = queryBuilder.eq(filter.column, filter.value);
            break;
          case 'neq':
            queryBuilder = queryBuilder.neq(filter.column, filter.value);
            break;
          case 'gt': {
            throw new Error('Not implemented yet: "gt" case');
          }
          case 'gte': {
            throw new Error('Not implemented yet: "gte" case');
          }
          case 'lt': {
            throw new Error('Not implemented yet: "lt" case');
          }
          case 'lte': {
            throw new Error('Not implemented yet: "lte" case');
          }
          case 'like': {
            throw new Error('Not implemented yet: "like" case');
          }
          case 'ilike': {
            throw new Error('Not implemented yet: "ilike" case');
          }
          case 'in': {
            throw new Error('Not implemented yet: "in" case');
          }
          case 'is': {
            throw new Error('Not implemented yet: "is" case');
          }
          // Add other operators as needed
        }
      }

      const { data, error, count } = await queryBuilder.select('*');

      return {
        data,
        error: error ? new Error(error.message) : null,
        count: count ?? undefined,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Delete a record by ID
   */
  async deleteRecord(tableName: string, id: string, idColumn = 'id'): Promise<{ data: TableRecord | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.from(tableName).delete().eq(idColumn, id).select().single();

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Delete multiple records with filters
   */
  async deleteRecords(
    tableName: string,
    filters: TableFilter[]
  ): Promise<{ data: TableRecord[] | null; error: Error | null; count?: number }> {
    try {
      let queryBuilder = this.supabase.from(tableName).delete();

      // Apply filters
      for (const filter of filters) {
        switch (filter.operator) {
          case 'eq':
            queryBuilder = queryBuilder.eq(filter.column, filter.value);
            break;
          case 'neq':
            queryBuilder = queryBuilder.neq(filter.column, filter.value);
            break;
          case 'gt': {
            throw new Error('Not implemented yet: "gt" case');
          }
          case 'gte': {
            throw new Error('Not implemented yet: "gte" case');
          }
          case 'lt': {
            throw new Error('Not implemented yet: "lt" case');
          }
          case 'lte': {
            throw new Error('Not implemented yet: "lte" case');
          }
          case 'like': {
            throw new Error('Not implemented yet: "like" case');
          }
          case 'ilike': {
            throw new Error('Not implemented yet: "ilike" case');
          }
          case 'in': {
            throw new Error('Not implemented yet: "in" case');
          }
          case 'is': {
            throw new Error('Not implemented yet: "is" case');
          }
          // Add other operators as needed
        }
      }

      const { data, error, count } = await queryBuilder.select('*');

      return {
        data,
        error: error ? new Error(error.message) : null,
        count: count ?? undefined,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Upsert (insert or update) a record
   */
  async upsertRecord(
    tableName: string,
    record: TableRecord,
    onConflict?: string
  ): Promise<{ data: TableRecord | null; error: Error | null }> {
    try {
      const upsertQuery = this.supabase.from(tableName).upsert(record, { onConflict });

      const { data, error } = await upsertQuery.select().single();

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Count records in a table with optional filters
   */
  async countRecords(tableName: string, filters?: TableFilter[]): Promise<{ count: number | null; error: Error | null }> {
    try {
      let queryBuilder = this.supabase.from(tableName).select('*', { count: 'exact', head: true });

      // Apply filters
      if (filters && filters.length > 0) {
        for (const filter of filters) {
          switch (filter.operator) {
            case 'eq':
              queryBuilder = queryBuilder.eq(filter.column, filter.value);
              break;
            case 'neq':
              queryBuilder = queryBuilder.neq(filter.column, filter.value);
              break;
            case 'gt': {
              throw new Error('Not implemented yet: "gt" case');
            }
            case 'gte': {
              throw new Error('Not implemented yet: "gte" case');
            }
            case 'lt': {
              throw new Error('Not implemented yet: "lt" case');
            }
            case 'lte': {
              throw new Error('Not implemented yet: "lte" case');
            }
            case 'like': {
              throw new Error('Not implemented yet: "like" case');
            }
            case 'ilike': {
              throw new Error('Not implemented yet: "ilike" case');
            }
            case 'in': {
              throw new Error('Not implemented yet: "in" case');
            }
            case 'is': {
              throw new Error('Not implemented yet: "is" case');
            }
            // Add other operators as needed
          }
        }
      }

      const { count, error } = await queryBuilder;

      return {
        count,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        count: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Get table schema/structure
   */
  async getTableSchema(tableName: string): Promise<{
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      defaultValue?: any;
    }>;
    error: Error | null;
  }> {
    try {
      // This requires a custom RPC function in Supabase
      const { data, error } = await this.supabase.rpc('get_table_schema', {
        table_name: tableName,
      });

      return {
        columns: data ?? [],
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        columns: [],
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Execute a raw SQL query (requires RLS bypass permissions)
   */
  async executeQuery(query: string, params?: any[]): Promise<{ data: any[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.rpc('execute_sql', {
        query,
        params: params ?? [],
      });

      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
      };
    }
  }

  /**
   * Bulk operations with transaction support
   */
  async bulkOperation(
    operations: Array<{
      type: 'insert' | 'update' | 'delete';
      tableName: string;
      data?: TableRecord | TableRecord[];
      filters?: TableFilter[];
      id?: string;
      idColumn?: string;
    }>
  ): Promise<{ success: boolean; error: Error | null; results: any[] }> {
    try {
      // Note: Supabase doesn't have native transaction support in the client library
      // This would need to be implemented as a stored procedure or RPC function
      const { data, error } = await this.supabase.rpc('bulk_operation', {
        operations,
      });

      return {
        success: !error,
        error: error ? new Error(error.message) : null,
        results: data ?? [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error occurred'),
        results: [],
      };
    }
  }
}
