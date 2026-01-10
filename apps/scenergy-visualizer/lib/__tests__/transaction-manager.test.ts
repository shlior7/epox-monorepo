/**
 * Transaction Manager Tests
 * Tests for transaction-based state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransactionManager } from '../state/transaction-manager';
import { suppressConsole, restoreConsole, waitFor } from './setup';
import { createTestClient } from './fixtures/test-data';

describe('TransactionManager', () => {
  let manager: TransactionManager;

  beforeEach(() => {
    manager = new TransactionManager();
    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
    vi.clearAllMocks();
  });

  describe('Basic Transaction Operations', () => {
    it('should execute a successful transaction', async () => {
      const client = createTestClient();
      const getCurrentState = () => client;
      const applyUpdate = (state: typeof client) => ({
        ...state,
        name: 'Updated Client',
      });
      const persistUpdate = vi.fn(async (state: typeof client) => {
        return { success: true };
      });

      const result = await manager.executeTransaction(
        { clientId: client.id },
        getCurrentState,
        applyUpdate,
        persistUpdate
      );

      expect(result).toEqual({ success: true });
      expect(persistUpdate).toHaveBeenCalledTimes(1);
    });

    it('should increment version on successful transaction', async () => {
      const client = createTestClient();
      const initialVersion = manager.getVersion(client.id);

      await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => ({ ...state, name: 'Updated' }),
        async () => ({})
      );

      const newVersion = manager.getVersion(client.id);
      expect(newVersion?.version).toBe((initialVersion?.version || 0) + 1);
    });

    it('should track transaction history', async () => {
      const client = createTestClient();

      await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => ({ ...state, name: 'Updated' }),
        async () => ({})
      );

      const transactions = manager.getAllTransactions();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe('committed');
    });
  });

  describe('Transaction Locking', () => {
    it('should acquire and release lock during transaction', async () => {
      const client = createTestClient();

      expect(manager.isLocked(client.id)).toBe(false);

      const transactionPromise = manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => {
          // During persist, check if locked
          expect(manager.isLocked(client.id)).toBe(true);
          await waitFor(100);
          return {};
        }
      );

      await transactionPromise;
      expect(manager.isLocked(client.id)).toBe(false);
    });

    it('should wait for lock to be released before starting new transaction', async () => {
      const client = createTestClient();
      const executionOrder: number[] = [];

      // Start first transaction (holds lock for 200ms)
      const transaction1 = manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => {
          executionOrder.push(1);
          await waitFor(200);
          return {};
        }
      );

      // Wait a bit to ensure first transaction starts
      await waitFor(50);

      // Start second transaction (should wait for lock)
      const transaction2 = manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => {
          executionOrder.push(2);
          return {};
        }
      );

      await Promise.all([transaction1, transaction2]);

      // Second transaction should execute after first
      expect(executionOrder).toEqual([1, 2]);
    });

    it('should timeout if lock cannot be acquired', async () => {
      const client = createTestClient();

      // Start a long-running transaction
      const longTransaction = manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => {
          await waitFor(6000); // 6 seconds (longer than timeout)
          return {};
        }
      );

      await waitFor(50);

      // Try to start another transaction - should wait for lock and timeout
      // Use same manager instance to see the lock
      await expect(
        manager.executeTransaction(
          { clientId: client.id },
          () => client,
          (state) => state,
          async () => ({}),
          { maxRetries: 1 }
        )
      ).rejects.toThrow('Failed to acquire lock');

      // Clean up
      longTransaction.catch(() => {}); // Ignore error from cancelled transaction
    });
  });

  describe('Transaction Retry Logic', () => {
    it('should retry failed transactions', async () => {
      const client = createTestClient();
      let attemptCount = 0;

      const persistUpdate = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      const result = await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        persistUpdate,
        { maxRetries: 3, retryDelay: 10 }
      );

      expect(result).toEqual({ success: true });
      expect(persistUpdate).toHaveBeenCalledTimes(3);
      expect(attemptCount).toBe(3);
    });

    it('should use exponential backoff for retries', async () => {
      const client = createTestClient();
      const retryTimestamps: number[] = [];
      let attemptCount = 0;

      const persistUpdate = vi.fn(async () => {
        retryTimestamps.push(Date.now());
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        persistUpdate,
        { maxRetries: 3, retryDelay: 100 }
      );

      // Check that delays are increasing (exponential backoff)
      if (retryTimestamps.length >= 3) {
        const delay1 = retryTimestamps[1] - retryTimestamps[0];
        const delay2 = retryTimestamps[2] - retryTimestamps[1];
        // Second delay should be roughly 2x the first delay
        expect(delay2).toBeGreaterThan(delay1 * 1.5);
      }
    });

    it('should fail after max retries exceeded', async () => {
      const client = createTestClient();
      const persistUpdate = vi.fn(async () => {
        throw new Error('Persistent failure');
      });

      await expect(
        manager.executeTransaction(
          { clientId: client.id },
          () => client,
          (state) => state,
          persistUpdate,
          { maxRetries: 3, retryDelay: 10 }
        )
      ).rejects.toThrow('failed after 3 attempts');

      expect(persistUpdate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Transaction Rollback', () => {
    it('should call onRollback callback when transaction fails', async () => {
      const client = createTestClient();
      const onRollback = vi.fn();

      const persistUpdate = vi.fn(async () => {
        throw new Error('Persistent failure');
      });

      await expect(
        manager.executeTransaction(
          { clientId: client.id },
          () => client,
          (state) => state,
          persistUpdate,
          { maxRetries: 2, retryDelay: 10, onRollback }
        )
      ).rejects.toThrow();

      expect(onRollback).toHaveBeenCalledTimes(1);
      expect(onRollback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should mark transaction as failed on rollback', async () => {
      const client = createTestClient();

      const persistUpdate = vi.fn(async () => {
        throw new Error('Failure');
      });

      try {
        await manager.executeTransaction(
          { clientId: client.id },
          () => client,
          (state) => state,
          persistUpdate,
          { maxRetries: 1, retryDelay: 10 }
        );
      } catch (error) {
        // Expected to fail
      }

      const failedTransactions = manager.getFailedTransactions();
      expect(failedTransactions).toHaveLength(1);
      expect(failedTransactions[0].status).toBe('failed');
    });

    it('should call rollback callback when transaction fails', async () => {
      const client = createTestClient({ name: 'Original Name' });
      let currentState = client;
      let rolledBack = false;

      const persistUpdate = vi.fn(async () => {
        throw new Error('Failure');
      });

      try {
        await manager.executeTransaction(
          { clientId: client.id },
          () => currentState,
          (state) => {
            const updated = { ...state, name: 'Updated Name' };
            currentState = updated;
            return updated;
          },
          persistUpdate,
          { 
            maxRetries: 1, 
            retryDelay: 10,
            onRollback: (error) => {
              // Manually rollback state in callback
              currentState = client;
              rolledBack = true;
            }
          }
        );
      } catch (error) {
        // Expected to fail
      }

      // Rollback callback should have been called
      expect(rolledBack).toBe(true);
      // State should be manually rolled back in callback
      expect(currentState.name).toBe('Original Name');
    });
  });

  describe('Success Callbacks', () => {
    it('should call onSuccess callback when transaction succeeds', async () => {
      const client = createTestClient();
      const onSuccess = vi.fn();

      await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => ({}),
        { onSuccess }
      );

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('Version Validation', () => {
    it('should validate version matches expected version', async () => {
      const client = createTestClient();

      // Do a transaction to increment version
      await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => ({})
      );

      const version = manager.getVersion(client.id);
      expect(version?.version).toBe(1);

      // Validate correct version
      expect(manager.validateVersion(client.id, 1)).toBe(true);

      // Validate incorrect version
      expect(manager.validateVersion(client.id, 0)).toBe(false);
      expect(manager.validateVersion(client.id, 2)).toBe(false);
    });
  });

  describe('Concurrent Transactions', () => {
    it('should handle concurrent transactions on different entities', async () => {
      const client1 = createTestClient();
      const client2 = createTestClient();
      const results: string[] = [];

      const transaction1 = manager.executeTransaction(
        { clientId: client1.id },
        () => client1,
        (state) => state,
        async () => {
          await waitFor(100);
          results.push('client1');
          return {};
        }
      );

      const transaction2 = manager.executeTransaction(
        { clientId: client2.id },
        () => client2,
        (state) => state,
        async () => {
          await waitFor(100);
          results.push('client2');
          return {};
        }
      );

      await Promise.all([transaction1, transaction2]);

      // Both should complete (order doesn't matter as they're on different entities)
      expect(results).toHaveLength(2);
      expect(results).toContain('client1');
      expect(results).toContain('client2');
    });
  });

  describe('Transaction History Management', () => {
    it('should retrieve transaction by ID', async () => {
      const client = createTestClient();

      await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => ({})
      );

      const transactions = manager.getAllTransactions();
      const transaction = manager.getTransaction(transactions[0].id);

      expect(transaction).toBeDefined();
      expect(transaction?.id).toBe(transactions[0].id);
    });

    it('should clear transaction history', async () => {
      const client = createTestClient();

      await manager.executeTransaction(
        { clientId: client.id },
        () => client,
        (state) => state,
        async () => ({})
      );

      expect(manager.getAllTransactions()).toHaveLength(1);

      manager.clearHistory();

      expect(manager.getAllTransactions()).toHaveLength(0);
    });
  });
});

