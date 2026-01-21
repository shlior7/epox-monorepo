import type { DrizzleClient } from '../client';

export async function withTransaction<T>(drizzle: DrizzleClient, fn: (tx: DrizzleClient) => Promise<T>): Promise<T> {
  const drizzleAny = drizzle as unknown as Record<string, unknown>;
  if (typeof drizzleAny.transaction !== 'function') {
    console.warn(
      '[visualizer-db] Transaction requested but driver does not support transactions. ' +
        'Operations will run without transaction isolation.'
    );
    return fn(drizzle);
  }

  type TransactionFn = <T>(fn: (tx: DrizzleClient) => Promise<T>) => Promise<T>;
  try {
    return await (drizzleAny.transaction as TransactionFn)(async (tx) => fn(tx as DrizzleClient));
  } catch (error) {
    if (isUnsupportedTransactionError(error)) {
      console.warn(
        '[visualizer-db] Transaction requested but driver does not support transactions. ' +
          'Operations will run without transaction isolation.'
      );
      return fn(drizzle);
    }
    throw error;
  }
}

function isUnsupportedTransactionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('no transactions support') && message.includes('neon-http');
}
