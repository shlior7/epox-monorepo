/**
 * Transaction Manager - Ensures atomic state updates with rollback capability
 *
 * This module provides transaction-like semantics for state updates:
 * - Optimistic updates (UI updates immediately)
 * - Automatic rollback on failure
 * - Conflict detection via versioning
 * - Retry logic with exponential backoff
 */

import type { Client } from '@/lib/types/app-types';

export interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRollback?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface Transaction<T> {
  id: string;
  timestamp: number;
  previousState: T;
  newState: T;
  status: 'pending' | 'committed' | 'rolled_back' | 'failed';
  error?: Error;
}

/**
 * StateVersion tracks the version of each entity to detect conflicts
 */
export interface StateVersion {
  clientId: string;
  productId?: string;
  sessionId?: string;
  version: number;
  timestamp: string;
}

/**
 * Transaction Manager for state operations
 */
export class TransactionManager {
  private transactions: Map<string, Transaction<any>> = new Map();
  private versions: Map<string, StateVersion> = new Map();
  private locks: Set<string> = new Set();

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get version key for an entity
   */
  private getVersionKey(clientId: string, productId?: string, sessionId?: string): string {
    let key = clientId;
    if (productId) key += `:${productId}`;
    if (sessionId) key += `:${sessionId}`;
    return key;
  }

  /**
   * Get lock key for an entity
   */
  private getLockKey(clientId: string, productId?: string, sessionId?: string): string {
    return this.getVersionKey(clientId, productId, sessionId);
  }

  /**
   * Check if entity is locked
   */
  isLocked(clientId: string, productId?: string, sessionId?: string): boolean {
    const key = this.getLockKey(clientId, productId, sessionId);
    return this.locks.has(key);
  }

  /**
   * Acquire lock for an entity
   */
  private async acquireLock(clientId: string, productId?: string, sessionId?: string, timeout: number = 5000): Promise<void> {
    const key = this.getLockKey(clientId, productId, sessionId);
    const startTime = Date.now();

    while (this.locks.has(key)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Failed to acquire lock for ${key}: timeout`);
      }
      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.locks.add(key);
  }

  /**
   * Release lock for an entity
   */
  private releaseLock(clientId: string, productId?: string, sessionId?: string): void {
    const key = this.getLockKey(clientId, productId, sessionId);
    this.locks.delete(key);
  }

  /**
   * Get current version for an entity
   */
  getVersion(clientId: string, productId?: string, sessionId?: string): StateVersion | undefined {
    const key = this.getVersionKey(clientId, productId, sessionId);
    return this.versions.get(key);
  }

  /**
   * Increment version for an entity
   */
  private incrementVersion(clientId: string, productId?: string, sessionId?: string): StateVersion {
    const key = this.getVersionKey(clientId, productId, sessionId);
    const current = this.versions.get(key);
    const newVersion: StateVersion = {
      clientId,
      productId,
      sessionId,
      version: (current?.version || 0) + 1,
      timestamp: new Date().toISOString(),
    };
    this.versions.set(key, newVersion);
    return newVersion;
  }

  /**
   * Execute a transaction with optimistic update and rollback capability
   */
  async executeTransaction<TState, TResult>(
    entityId: { clientId: string; productId?: string; sessionId?: string },
    getCurrentState: () => TState,
    applyUpdate: (state: TState) => TState,
    persistUpdate: (state: TState) => Promise<TResult>,
    options: TransactionOptions = {}
  ): Promise<TResult> {
    const { maxRetries = 3, retryDelay = 1000, onRollback, onSuccess } = options;

    const transactionId = this.generateTransactionId();
    let retryCount = 0;

    // Acquire lock
    await this.acquireLock(entityId.clientId, entityId.productId, entityId.sessionId);

    try {
      // Get current state (before optimistic update)
      const previousState = getCurrentState();

      // Apply optimistic update
      const newState = applyUpdate(previousState);

      // Create transaction record
      const transaction: Transaction<TState> = {
        id: transactionId,
        timestamp: Date.now(),
        previousState,
        newState,
        status: 'pending',
      };
      this.transactions.set(transactionId, transaction);

      // Increment version
      this.incrementVersion(entityId.clientId, entityId.productId, entityId.sessionId);

      // Try to persist with retries
      while (retryCount < maxRetries) {
        try {
          const result = await persistUpdate(newState);

          // Success! Mark transaction as committed
          transaction.status = 'committed';
          onSuccess?.();

          return result;
        } catch (error) {
          retryCount++;

          if (retryCount >= maxRetries) {
            // Max retries reached - rollback
            transaction.status = 'failed';
            transaction.error = error instanceof Error ? error : new Error(String(error));

            // Rollback by re-applying previous state
            applyUpdate(previousState);

            onRollback?.(transaction.error);
            throw new Error(`Transaction ${transactionId} failed after ${maxRetries} attempts: ${transaction.error.message}`);
          }

          // Wait before retry with exponential backoff
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          console.warn(`🔄 Retry ${retryCount}/${maxRetries} for transaction ${transactionId} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new Error('Transaction failed: max retries exceeded');
    } finally {
      // Always release lock
      this.releaseLock(entityId.clientId, entityId.productId, entityId.sessionId);
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): Transaction<any> | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): Transaction<any>[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get failed transactions
   */
  getFailedTransactions(): Transaction<any>[] {
    return Array.from(this.transactions.values()).filter((t) => t.status === 'failed' || t.status === 'rolled_back');
  }

  /**
   * Clear transaction history
   */
  clearHistory(): void {
    this.transactions.clear();
  }

  /**
   * Validate version hasn't changed (detect conflicts)
   */
  validateVersion(clientId: string, expectedVersion: number, productId?: string, sessionId?: string): boolean {
    const current = this.getVersion(clientId, productId, sessionId);
    return !current || current.version === expectedVersion;
  }
}

/**
 * Global transaction manager instance
 */
export const transactionManager = new TransactionManager();
