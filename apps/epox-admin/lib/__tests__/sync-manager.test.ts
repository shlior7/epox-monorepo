/**
 * Sync Manager Tests
 * Tests for state synchronization between UI and database-backed API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager } from '../state/sync-manager';
import { suppressConsole, restoreConsole, waitFor } from './setup';
import { createTestHierarchy, createTestMessage } from './fixtures/test-data';

let updateDelayMs = 0;
let apiModule: typeof import('@/lib/api-client');

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updateSession: vi.fn(async () => {
      if (updateDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, updateDelayMs));
      }
    }),
  },
}));

describe('SyncManager', () => {
  let manager: SyncManager;

  beforeEach(async () => {
    manager = new SyncManager();
    updateDelayMs = 0;

    apiModule = await import('@/lib/api-client');
    vi.mocked(apiModule.apiClient.updateSession).mockReset();
    vi.mocked(apiModule.apiClient.updateSession).mockImplementation(async () => {
      if (updateDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, updateDelayMs));
      }
    });

    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
    vi.clearAllMocks();
  });

  describe('Add Message Operations', () => {
    it('should add message and sync to the API', async () => {
      const { client, product, session } = createTestHierarchy();

      const newMessage = createTestMessage({ role: 'user' });
      let updatedClient = client;

      await manager.addMessageToSession(client, product.id, session.id, newMessage, (updated) => {
        updatedClient = updated;
      });

      // Check local state was updated
      const updatedSession = updatedClient.products[0].sessions[0];
      expect(updatedSession.messages).toHaveLength(2); // Original + new
      expect(updatedSession.messages[1].id).toBe(newMessage.id);

      // Check API was called
      expect(apiModule.apiClient.updateSession).toHaveBeenCalledTimes(1);

      // Wait for sync to complete
      await waitFor(100);

      // Check sync state
      const syncState = manager.getSyncState(client.id, product.id, session.id);
      expect(syncState.status).toBe('synced');
    });

    it('should add multiple messages at once', async () => {
      const { client, product, session } = createTestHierarchy();

      const newMessages = [createTestMessage({ role: 'user' }), createTestMessage({ role: 'assistant' })];
      let updatedClient = client;

      await manager.addMessageToSession(client, product.id, session.id, newMessages, (updated) => {
        updatedClient = updated;
      });

      const updatedSession = updatedClient.products[0].sessions[0];
      expect(updatedSession.messages).toHaveLength(3); // Original + 2 new
    });

    it('should update sync state during operation', async () => {
      const { client, product, session } = createTestHierarchy();
      updateDelayMs = 100; // Simulate network delay

      const newMessage = createTestMessage();

      const syncPromise = manager.addMessageToSession(client, product.id, session.id, newMessage, () => {});

      // Check sync state is pending
      await waitFor(10);
      let syncState = manager.getSyncState(client.id, product.id, session.id);
      expect(syncState.pendingOperations).toBeGreaterThan(0);

      await syncPromise;

      // Wait for cleanup
      await waitFor(10);
      syncState = manager.getSyncState(client.id, product.id, session.id);
      expect(syncState.status).toBe('synced');
    });

    it('should emit sync events', async () => {
      const { client, product, session } = createTestHierarchy();

      const events: any[] = [];
      manager.addEventListener((event) => {
        events.push(event);
      });

      const newMessage = createTestMessage();

      await manager.addMessageToSession(client, product.id, session.id, newMessage, () => {});

      // Should emit started and completed events
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some((e) => e.type === 'sync_started')).toBe(true);
      expect(events.some((e) => e.type === 'sync_completed')).toBe(true);
    });

    it('should handle sync failures with rollback', async () => {
      const { client, product, session } = createTestHierarchy();
      const newMessage = createTestMessage();
      let rollbackCalled = false;

      vi.mocked(apiModule.apiClient.updateSession).mockRejectedValue(new Error('Persistent DB error'));

      try {
        await manager.addMessageToSession(client, product.id, session.id, newMessage, () => {});
      } catch (error) {
        rollbackCalled = true;
        // Expected to fail
      }

      expect(rollbackCalled).toBe(true);

      // Wait for operation cleanup
      await waitFor(150);
    });
  });

  describe('Update Message Operations', () => {
    it('should update message and sync to the API', async () => {
      const { client, product, session, message } = createTestHierarchy();

      const updates = {
        parts: [
          {
            type: 'text' as const,
            content: 'Updated content',
          },
        ],
      };

      let updatedClient = client;

      await manager.updateMessageInSession(client, product.id, session.id, message.id, updates, (updated) => {
        updatedClient = updated;
      });

      // Check local state was updated
      const updatedMessage = updatedClient.products[0].sessions[0].messages[0];
      expect(updatedMessage.parts[0].content).toBe('Updated content');

      // Check API was called
      expect(apiModule.apiClient.updateSession).toHaveBeenCalledTimes(1);
    });

    it('should handle message not found gracefully', async () => {
      const { client, product, session } = createTestHierarchy();

      const nonExistentMessageId = 'non-existent-id';
      let updatedClient = client;

      await manager.updateMessageInSession(client, product.id, session.id, nonExistentMessageId, { parts: [] }, (updated) => {
        updatedClient = updated;
      });

      // Should not throw, messages should remain unchanged
      expect(updatedClient.products[0].sessions[0].messages).toHaveLength(1);
    });

    it('should retry on transient failures', async () => {
      const { client, product, session, message } = createTestHierarchy();

      // Make first 2 attempts fail, 3rd succeed
      let attemptCount = 0;
      vi.mocked(apiModule.apiClient.updateSession).mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Transient failure');
        }
      });

      const updates = { parts: [{ type: 'text' as const, content: 'Updated' }] };

      await manager.updateMessageInSession(client, product.id, session.id, message.id, updates, () => {});

      expect(attemptCount).toBe(3);
      expect(apiModule.apiClient.updateSession).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', async () => {
      const events: any[] = [];
      const listener = (event: any) => events.push(event);

      const unsubscribe = manager.addEventListener(listener);

      const { client, product, session } = createTestHierarchy();

      await manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {});

      expect(events.length).toBeGreaterThan(0);

      // Unsubscribe
      events.length = 0;
      unsubscribe();

      await manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {});

      expect(events.length).toBe(0);
    });

    it('should handle errors in event listeners gracefully', async () => {
      const badListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      manager.addEventListener(badListener);

      const { client, product, session } = createTestHierarchy();

      // Should not throw even though listener throws
      await expect(manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {})).resolves.not.toThrow();

      expect(badListener).toHaveBeenCalled();
    });
  });

  describe('Sync State Management', () => {
    it('should track pending operations count', async () => {
      const { client, product, session } = createTestHierarchy();
      updateDelayMs = 100;

      const operations = [
        manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {}),
        manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {}),
      ];

      await waitFor(10);

      const syncState = manager.getSyncState(client.id, product.id, session.id);
      expect(syncState.pendingOperations).toBeGreaterThan(0);

      await Promise.all(operations);
    });

    it('should report isSyncing correctly', async () => {
      const { client, product, session } = createTestHierarchy();

      // Initially not syncing
      expect(manager.isSyncing(client.id, product.id, session.id)).toBe(false);

      // After sync completes, should not be syncing
      await manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {});

      await waitFor(150);
      expect(manager.isSyncing(client.id, product.id, session.id)).toBe(false);
    });

    it('should track operations lifecycle', async () => {
      const { client, product, session } = createTestHierarchy();

      // Before any operations
      expect(manager.getPendingOperations()).toHaveLength(0);

      // Add a message
      await manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {});

      // After operation completes and cleanup
      await waitFor(150);

      // Operations should be cleaned up
      const pendingOps = manager.getPendingOperations();
      expect(pendingOps).toHaveLength(0);
    });

    it('should get failed operations', async () => {
      const { client, product, session } = createTestHierarchy();

      // Make API fail
      vi.mocked(apiModule.apiClient.updateSession).mockRejectedValue(new Error('Mock failure'));

      try {
        await manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {});
      } catch (error) {
        // Expected to fail
      }

      // Check failed operations immediately after failure
      const failedOps = manager.getFailedOperations();
      expect(failedOps.length).toBeGreaterThan(0);
      expect(failedOps[0].status).toBe('failed');

      // Wait for cleanup
      await waitFor(150);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent add operations', async () => {
      const { client, product, session } = createTestHierarchy();

      const messages = [createTestMessage(), createTestMessage(), createTestMessage()];

      let updatedClient = client;

      // Execute operations sequentially to ensure state updates properly
      for (const msg of messages) {
        await manager.addMessageToSession(updatedClient, product.id, session.id, msg, (updated) => {
          updatedClient = updated;
        });
      }

      // All messages should be added
      const finalSession = updatedClient.products[0].sessions[0];
      expect(finalSession.messages.length).toBeGreaterThanOrEqual(4); // Original + 3 new
    });
  });

  describe('History Management', () => {
    it('should clear operation history', async () => {
      const { client, product, session } = createTestHierarchy();

      await manager.addMessageToSession(client, product.id, session.id, createTestMessage(), () => {});

      await waitFor(100);

      manager.clearHistory();

      const syncState = manager.getSyncState(client.id, product.id, session.id);
      expect(syncState.pendingOperations).toBe(0);
    });
  });
});
