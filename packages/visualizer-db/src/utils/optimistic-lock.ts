import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleClient } from '../client';
import { NotFoundError, OptimisticLockError } from '../errors';

interface VersionedTable {
  id: unknown;
  version?: unknown;
  updatedAt?: unknown;
}

export async function updateWithVersion<T extends { version: number }>(
  drizzle: DrizzleClient,
  table: VersionedTable,
  id: string,
  data: Partial<T>,
  expectedVersion?: number
): Promise<T> {
  const updatePayload: Record<string, unknown> = {
    ...data,
    version:
      expectedVersion !== undefined
        ? expectedVersion + 1
        : sql`${(table as any).version} + 1`,
  };

  if ('updatedAt' in table) {
    updatePayload.updatedAt = new Date();
  }

  const whereClause =
    expectedVersion !== undefined
      ? and(eq((table as any).id, id), eq((table as any).version, expectedVersion))
      : eq((table as any).id, id);

  const updated = await drizzle.update(table as any).set(updatePayload).where(whereClause).returning();

  if (updated[0]) {
    return updated[0] as T;
  }

  if (expectedVersion !== undefined) {
    const current = await drizzle
      .select()
      .from(table as any)
      .where(eq((table as any).id, id))
      .limit(1);

    if (!current[0]) {
      throw new NotFoundError((table as any).name, id);
    }

    throw new OptimisticLockError((table as any).name, id, expectedVersion, current[0].version);
  }

  throw new NotFoundError((table as any).name, id);
}
