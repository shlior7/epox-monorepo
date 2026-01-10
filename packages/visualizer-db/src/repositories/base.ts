import { eq } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { v4 as uuidv4 } from 'uuid';
import type { DrizzleClient } from '../client';
import { NotFoundError } from '../errors';

/**
 * Type for Drizzle PG tables.
 * We use 'any' for the config to accept all Drizzle table types without strict constraints.
 * The id column requirement is enforced by the generic T extends { id: string }.
 */
type DrizzleTable = PgTableWithColumns<any>;

/**
 * Get the table name from a Drizzle table object.
 * Drizzle stores the SQL name in the internal symbol.
 */
function getTableName(table: DrizzleTable): string {
  // Drizzle tables have a Symbol for the table name
  const tableSymbol = Object.getOwnPropertySymbols(table).find(
    (s) => s.description === 'drizzle:Name'
  );
  if (tableSymbol) {
    return (table as any)[tableSymbol] as string;
  }
  // Fallback: try to get from _.name
  if ('_' in table && typeof (table as any)._.name === 'string') {
    return (table as any)._.name;
  }
  return 'unknown_table';
}

export class BaseRepository<T extends { id: string }> {
  protected readonly tableName: string;

  constructor(
    protected drizzle: DrizzleClient,
    protected table: DrizzleTable
  ) {
    this.tableName = getTableName(table);
  }

  protected generateId(): string {
    return uuidv4();
  }

  protected mapToEntity(row: unknown): T {
    return row as T;
  }

  async getById(id: string): Promise<T | null> {
    const rows = await this.drizzle
      .select()
      .from(this.table as any)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return rows[0] ? this.mapToEntity(rows[0]) : null;
  }

  async requireById(id: string): Promise<T> {
    const entity = await this.getById(id);
    if (!entity) {
      throw new NotFoundError(this.tableName, id);
    }
    return entity;
  }

  async delete(id: string): Promise<void> {
    const rows = await this.drizzle
      .delete(this.table as any)
      .where(eq((this.table as any).id, id))
      .returning();
    if (!Array.isArray(rows) || !rows[0]) {
      throw new NotFoundError(this.tableName, id);
    }
  }
}
