/**
 * Sync Manager - Ensures UI state and the database-backed API stay synchronized
 *
 * This module provides:
 * - Optimistic updates with automatic sync
 * - Conflict detection and resolution
 * - Retry logic with exponential backoff
 * - Sync status tracking
 * - Event-based notifications
 */

import type { Client, Session, Message } from '@/lib/types/app-types';
import { apiClient } from '@/lib/api-client';
import { transactionManager } from './transaction-manager';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'conflict';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt?: string;
  pendingOperations: number;
  error?: Error;
}

export interface SyncOperation {
  id: string;
  type: 'add_message' | 'update_message' | 'add_session' | 'update_session';
  entityId: {
    clientId: string;
    productId: string;
    sessionId: string;
    messageId?: string;
  };
  timestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  error?: Error;
}

export type SyncEventType = 'sync_started' | 'sync_completed' | 'sync_failed' | 'conflict_detected';

export interface SyncEvent {
  type: SyncEventType;
  operation: SyncOperation;
  timestamp: number;
}

/**
 * Sync Manager for coordinating UI state and S3 storage
 */
export class SyncManager {
  private operations: Map<string, SyncOperation> = new Map();
  private syncState: Map<string, SyncState> = new Map();
  private listeners: ((event: SyncEvent) => void)[] = [];

  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get sync key for an entity
   */
  private getSyncKey(clientId: string, productId?: string, sessionId?: string): string {
    let key = clientId;
    if (productId) key += `:${productId}`;
    if (sessionId) key += `:${sessionId}`;
    return key;
  }

  /**
   * Get sync state for an entity
   */
  getSyncState(clientId: string, productId?: string, sessionId?: string): SyncState {
    const key = this.getSyncKey(clientId, productId, sessionId);
    return (
      this.syncState.get(key) || {
        status: 'synced',
        pendingOperations: 0,
      }
    );
  }

  /**
   * Update sync state
   */
  private updateSyncState(clientId: string, updates: Partial<SyncState>, productId?: string, sessionId?: string): void {
    const key = this.getSyncKey(clientId, productId, sessionId);
    const current = this.getSyncState(clientId, productId, sessionId);
    this.syncState.set(key, { ...current, ...updates });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: SyncEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: SyncEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync event listener:', error);
      }
    });
  }

  /**
   * Add a message to a session with automatic sync
   */
  async addMessageToSession(
    client: Client,
    productId: string,
    sessionId: string,
    messages: Message | Message[],
    updateLocalState: (updatedClient: Client) => void
  ): Promise<void> {
    const messagesToAdd = Array.isArray(messages) ? messages : [messages];
    const operationId = this.generateOperationId();

    const operation: SyncOperation = {
      id: operationId,
      type: 'add_message',
      entityId: { clientId: client.id, productId, sessionId },
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.operations.set(operationId, operation);
    this.updateSyncState(client.id, { pendingOperations: this.operations.size }, productId, sessionId);

    try {
      await transactionManager.executeTransaction(
        { clientId: client.id, productId, sessionId },
        // Get current state
        () => client,
        // Apply optimistic update
        (currentClient) => {
          const updatedClient = this.applyAddMessages(currentClient, productId, sessionId, messagesToAdd);
          updateLocalState(updatedClient);
          return updatedClient;
        },
        // Persist to DB
        async (updatedClient) => {
          operation.status = 'syncing';
          this.emitEvent({ type: 'sync_started', operation, timestamp: Date.now() });

          const product = updatedClient.products.find((p) => p.id === productId);
          if (!product) throw new Error('Product not found');

          const session = product.sessions.find((s) => s.id === sessionId);
          if (!session) throw new Error('Session not found');

          await apiClient.updateSession(updatedClient.id, productId, session);

          operation.status = 'completed';
          this.updateSyncState(
            client.id,
            {
              status: 'synced',
              lastSyncedAt: new Date().toISOString(),
              pendingOperations: this.operations.size - 1,
            },
            productId,
            sessionId
          );

          this.emitEvent({ type: 'sync_completed', operation, timestamp: Date.now() });
        },
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRollback: (error) => {
            operation.status = 'failed';
            operation.error = error;
            this.updateSyncState(client.id, { status: 'error', error }, productId, sessionId);
            this.emitEvent({ type: 'sync_failed', operation, timestamp: Date.now() });
            console.error('❌ Failed to sync message addition:', error);
          },
          onSuccess: () => {
            console.log('✅ Successfully synced message addition');
          },
        }
      );
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      // Clean up completed/failed operations after a delay
      setTimeout(() => {
        this.operations.delete(operationId);
        this.updateSyncState(client.id, { pendingOperations: this.operations.size }, productId, sessionId);
      }, 100); // Reduced from 5000ms for testing
    }
  }

  /**
   * Update a message in a session with automatic sync
   */
  async updateMessageInSession(
    client: Client,
    productId: string,
    sessionId: string,
    messageId: string,
    updates: Partial<Message>,
    updateLocalState: (updatedClient: Client) => void
  ): Promise<void> {
    const operationId = this.generateOperationId();

    const operation: SyncOperation = {
      id: operationId,
      type: 'update_message',
      entityId: { clientId: client.id, productId, sessionId, messageId },
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.operations.set(operationId, operation);
    this.updateSyncState(client.id, { pendingOperations: this.operations.size }, productId, sessionId);

    try {
      await transactionManager.executeTransaction(
        { clientId: client.id, productId, sessionId },
        // Get current state
        () => client,
        // Apply optimistic update
        (currentClient) => {
          const updatedClient = this.applyUpdateMessage(currentClient, productId, sessionId, messageId, updates);
          updateLocalState(updatedClient);
          return updatedClient;
        },
        // Persist to DB
        async (updatedClient) => {
          operation.status = 'syncing';
          this.emitEvent({ type: 'sync_started', operation, timestamp: Date.now() });

          const product = updatedClient.products.find((p) => p.id === productId);
          if (!product) throw new Error('Product not found');

          const session = product.sessions.find((s) => s.id === sessionId);
          if (!session) throw new Error('Session not found');

          await apiClient.updateSession(updatedClient.id, productId, session);

          operation.status = 'completed';
          this.updateSyncState(
            client.id,
            {
              status: 'synced',
              lastSyncedAt: new Date().toISOString(),
              pendingOperations: this.operations.size - 1,
            },
            productId,
            sessionId
          );

          this.emitEvent({ type: 'sync_completed', operation, timestamp: Date.now() });
        },
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRollback: (error) => {
            operation.status = 'failed';
            operation.error = error;
            this.updateSyncState(client.id, { status: 'error', error }, productId, sessionId);
            this.emitEvent({ type: 'sync_failed', operation, timestamp: Date.now() });
            console.error('❌ Failed to sync message update:', error);
          },
          onSuccess: () => {
            console.log('✅ Successfully synced message update');
          },
        }
      );
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      setTimeout(() => {
        this.operations.delete(operationId);
        this.updateSyncState(client.id, { pendingOperations: this.operations.size }, productId, sessionId);
      }, 100); // Reduced from 5000ms for testing
    }
  }

  /**
   * Helper: Apply add messages to client
   */
  private applyAddMessages(client: Client, productId: string, sessionId: string, messages: Message[]): Client {
    return {
      ...client,
      products: client.products.map((product) => {
        if (product.id !== productId) return product;

        return {
          ...product,
          sessions: product.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              messages: [...session.messages, ...messages],
              updatedAt: new Date().toISOString(),
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Helper: Apply update message to client
   */
  private applyUpdateMessage(client: Client, productId: string, sessionId: string, messageId: string, updates: Partial<Message>): Client {
    return {
      ...client,
      products: client.products.map((product) => {
        if (product.id !== productId) return product;

        return {
          ...product,
          sessions: product.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            const messageIndex = session.messages.findIndex((m) => m.id === messageId);
            if (messageIndex === -1) {
              console.warn(`Message ${messageId} not found in session ${sessionId}`);
              return session;
            }

            const updatedMessages = [...session.messages];
            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...updates };

            return {
              ...session,
              messages: updatedMessages,
              updatedAt: new Date().toISOString(),
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      }),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.operations.values()).filter((op) => op.status === 'pending' || op.status === 'syncing');
  }

  /**
   * Get failed operations
   */
  getFailedOperations(): SyncOperation[] {
    return Array.from(this.operations.values()).filter((op) => op.status === 'failed');
  }

  /**
   * Check if entity is currently syncing
   */
  isSyncing(clientId: string, productId?: string, sessionId?: string): boolean {
    const state = this.getSyncState(clientId, productId, sessionId);
    return state.status === 'syncing' || state.pendingOperations > 0;
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operations.clear();
    this.syncState.clear();
  }
}

/**
 * Global sync manager instance
 */
export const syncManager = new SyncManager();
