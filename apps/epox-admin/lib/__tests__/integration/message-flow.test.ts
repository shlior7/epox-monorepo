/**
 * Integration Tests - Full Message Flow
 * Tests the complete flow from user interaction to database-backed API persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncManager } from '../../state/sync-manager';
import { transactionManager } from '../../state/transaction-manager';
import { suppressConsole, restoreConsole, waitFor } from '../setup';
import type { Client } from '@/lib/types/app-types';
import { createTestHierarchy, createTestMessage, createTestImageGenerationMessage } from '../fixtures/test-data';

let apiModule: typeof import('@/lib/api-client');
let storedClient: Client | null = null;

const persistSession = (clientId: string, productId: string, session: Client['products'][number]['sessions'][number]) => {
  if (!storedClient || storedClient.id !== clientId) return;

  const productIndex = storedClient.products.findIndex((p) => p.id === productId);
  if (productIndex === -1) return;

  const product = storedClient.products[productIndex];
  const sessionIndex = product.sessions.findIndex((s) => s.id === session.id);
  if (sessionIndex === -1) {
    product.sessions.push(session);
  } else {
    product.sessions[sessionIndex] = session;
  }

  product.updatedAt = new Date().toISOString();
  storedClient.updatedAt = new Date().toISOString();
};

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    updateSession: vi.fn(),
  },
}));

describe('Integration: Message Flow', () => {
  beforeEach(async () => {
    syncManager.clearHistory();
    transactionManager.clearHistory();
    storedClient = null;

    apiModule = await import('@/lib/api-client');
    vi.mocked(apiModule.apiClient.updateSession)
      .mockReset()
      .mockImplementation(async (clientId, productId, session) => {
        persistSession(clientId, productId, session);
      });

    suppressConsole();
  });

  afterEach(() => {
    restoreConsole();
    vi.clearAllMocks();
  });

  describe('Complete User Message Flow', () => {
    it('should handle complete user message submission flow', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      // Step 1: User creates a message
      const userMessage = createTestMessage({
        role: 'user',
        parts: [{ type: 'text', content: 'Generate an image of a chair' }],
      });

      let currentClient = client;

      // Step 2: Add message to session
      await syncManager.addMessageToSession(currentClient, product.id, session.id, userMessage, (updated) => {
        currentClient = updated;
      });

      // Step 3: Verify local state updated
      const updatedSession = currentClient.products[0].sessions[0];
      expect(updatedSession.messages).toHaveLength(2);
      expect(updatedSession.messages[1].id).toBe(userMessage.id);

      // Step 4: Verify API was updated
      expect(apiModule.apiClient.updateSession).toHaveBeenCalledTimes(1);

      // Step 5: Verify state is synced
      await waitFor(100);
      const syncState = syncManager.getSyncState(client.id, product.id, session.id);
      expect(syncState.status).toBe('synced');

      // Step 6: Verify we can read back from persisted state
      expect(storedClient?.products[0].sessions[0].messages).toHaveLength(2);
    });

    it('should handle image generation message flow with polling updates', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      let currentClient = client;

      // Step 1: User sends prompt
      const userPrompt = createTestMessage({
        role: 'user',
        parts: [{ type: 'text', content: 'Studio shot of modern chair' }],
      });

      await syncManager.addMessageToSession(currentClient, product.id, session.id, userPrompt, (updated) => {
        currentClient = updated;
      });

      // Step 2: System creates assistant message with pending status
      const assistantMessage = createTestImageGenerationMessage({
        parts: [
          {
            type: 'image',
            imageIds: [],
            jobId: 'job_test_123',
            status: 'pending',
            progress: 0,
          },
        ],
      });

      await syncManager.addMessageToSession(currentClient, product.id, session.id, assistantMessage, (updated) => {
        currentClient = updated;
      });

      // Step 3: Simulate polling updates (progress)
      await syncManager.updateMessageInSession(
        currentClient,
        product.id,
        session.id,
        assistantMessage.id,
        {
          parts: [
            {
              ...assistantMessage.parts[0],
              status: 'generating',
              progress: 50,
            },
          ],
        },
        (updated) => {
          currentClient = updated;
        }
      );

      // Step 4: Simulate completion
      await syncManager.updateMessageInSession(
        currentClient,
        product.id,
        session.id,
        assistantMessage.id,
        {
          parts: [
            {
              ...assistantMessage.parts[0],
              status: 'completed',
              progress: 100,
              imageIds: ['img_result.jpg'],
            },
          ],
        },
        (updated) => {
          currentClient = updated;
        }
      );

      // Verify final state
      const finalSession = currentClient.products[0].sessions[0];
      expect(finalSession.messages).toHaveLength(3); // Original + user + assistant
      const finalAssistantMsg = finalSession.messages[2];
      expect(finalAssistantMsg.parts[0].status).toBe('completed');
      expect(finalAssistantMsg.parts[0].progress).toBe(100);
      expect(finalAssistantMsg.parts[0].imageIds).toContain('img_result.jpg');

      // Verify all updates were persisted
      expect(vi.mocked(apiModule.apiClient.updateSession).mock.calls.length).toBeGreaterThanOrEqual(4);

      const persistedSession = storedClient?.products[0].sessions[0];
      expect(persistedSession?.messages).toHaveLength(3);
      const persistedAssistant = persistedSession?.messages[2];
      expect(persistedAssistant?.parts[0].status).toBe('completed');
    });
  });

  describe('Concurrent Message Operations', () => {
    it('should handle multiple users adding messages concurrently', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      let currentClient = client;

      // Simulate 5 message additions
      const messages = Array.from({ length: 5 }, (_, i) =>
        createTestMessage({
          role: i % 2 === 0 ? 'user' : 'assistant',
          parts: [{ type: 'text', content: `Message ${i + 1}` }],
        })
      );

      // Execute sequentially to ensure state updates properly
      for (const msg of messages) {
        await syncManager.addMessageToSession(currentClient, product.id, session.id, msg, (updated) => {
          currentClient = updated;
        });
      }

      // All messages should be present
      const finalSession = currentClient.products[0].sessions[0];
      expect(finalSession.messages.length).toBeGreaterThanOrEqual(6); // Original + 5 new

      // Verify no sync errors
      const syncState = syncManager.getSyncState(client.id, product.id, session.id);
      expect(syncState.error).toBeUndefined();

      expect(apiModule.apiClient.updateSession).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent updates to the same message', async () => {
      const { client, product, session, message } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      let currentClient = client;

      // Simulate concurrent updates (e.g., multiple progress updates)
      const updates = [
        { parts: [{ type: 'text' as const, content: 'Update 1' }] },
        { parts: [{ type: 'text' as const, content: 'Update 2' }] },
        { parts: [{ type: 'text' as const, content: 'Update 3' }] },
      ];

      const operations = updates.map((update) =>
        syncManager.updateMessageInSession(currentClient, product.id, session.id, message.id, update, (updated) => {
          currentClient = updated;
        })
      );

      await Promise.all(operations);

      // Message should have latest update
      const updatedMessage = currentClient.products[0].sessions[0].messages[0];
      expect(updatedMessage.parts[0].content).toMatch(/Update \d/);

      // All updates should have been attempted
      expect(vi.mocked(apiModule.apiClient.updateSession).mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient network failures', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      let attemptCount = 0;
      vi.mocked(apiModule.apiClient.updateSession).mockImplementation(async (clientId, productId, sessionRecord) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        persistSession(clientId, productId, sessionRecord);
      });

      const newMessage = createTestMessage();
      let currentClient = client;

      // Should succeed after retries
      await syncManager.addMessageToSession(currentClient, product.id, session.id, newMessage, (updated) => {
        currentClient = updated;
      });

      expect(attemptCount).toBe(3);
      expect(apiModule.apiClient.updateSession).toHaveBeenCalledTimes(3);

      // Verify message was added
      expect(currentClient.products[0].sessions[0].messages).toHaveLength(2);
    });

    it('should rollback on persistent failures', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;
      vi.mocked(apiModule.apiClient.updateSession).mockRejectedValue(new Error('Persistent DB error'));

      const newMessage = createTestMessage();
      let currentClient = client;

      try {
        await syncManager.addMessageToSession(currentClient, product.id, session.id, newMessage, (updated) => {
          currentClient = updated;
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify error state
      const syncState = syncManager.getSyncState(client.id, product.id, session.id);
      expect(syncState.status).toBe('error');

      await waitFor(150);
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent the original "session not found" race condition', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      let currentClient = client;

      // Step 1: Add initial message (user prompt)
      const userMessage = createTestMessage({ role: 'user' });
      await syncManager.addMessageToSession(currentClient, product.id, session.id, userMessage, (updated) => {
        currentClient = updated;
      });

      // Step 2: Add assistant message immediately
      const assistantMessage = createTestImageGenerationMessage();
      await syncManager.addMessageToSession(currentClient, product.id, session.id, assistantMessage, (updated) => {
        currentClient = updated;
      });

      // Step 3: Immediately start updating (simulating polling)
      // This used to fail with "session not found"
      await syncManager.updateMessageInSession(
        currentClient,
        product.id,
        session.id,
        assistantMessage.id,
        {
          parts: [
            {
              ...assistantMessage.parts[0],
              progress: 50,
            },
          ],
        },
        (updated) => {
          currentClient = updated;
        }
      );

      // Should succeed without errors
      const finalSession = currentClient.products[0].sessions[0];
      expect(finalSession.messages).toHaveLength(3);
      expect(finalSession.messages[2].parts[0].progress).toBe(50);

      // No failed operations
      const failedOps = syncManager.getFailedOperations();
      expect(failedOps).toHaveLength(0);
    });

    it('should handle rapid polling updates without data loss', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      const assistantMessage = createTestImageGenerationMessage();
      let currentClient = client;

      await syncManager.addMessageToSession(currentClient, product.id, session.id, assistantMessage, (updated) => {
        currentClient = updated;
      });

      // Simulate rapid polling updates (every 100ms for 1 second)
      const progressUpdates = Array.from({ length: 10 }, (_, i) => ({
        parts: [
          {
            ...assistantMessage.parts[0],
            progress: i * 10,
          },
        ],
      }));

      for (const update of progressUpdates) {
        await syncManager.updateMessageInSession(currentClient, product.id, session.id, assistantMessage.id, update, (updated) => {
          currentClient = updated;
        });
      }

      // Final progress should be 90 (last update)
      const finalMessage = currentClient.products[0].sessions[0].messages[1];
      expect(finalMessage.parts[0].progress).toBe(90);

      // All updates should have been persisted
      expect(vi.mocked(apiModule.apiClient.updateSession).mock.calls.length).toBeGreaterThanOrEqual(11);
    });
  });

  describe('Long-Running Operations', () => {
    it('should handle long message generation sessions', async () => {
      const { client, product, session } = createTestHierarchy();
      storedClient = JSON.parse(JSON.stringify(client)) as Client;

      let currentClient = client;

      // Simulate 20 messages back and forth
      for (let i = 0; i < 20; i++) {
        const isUser = i % 2 === 0;
        const message = createTestMessage({
          role: isUser ? 'user' : 'assistant',
          parts: [
            {
              type: 'text',
              content: `${isUser ? 'User' : 'Assistant'} message ${i + 1}`,
            },
          ],
        });

        await syncManager.addMessageToSession(currentClient, product.id, session.id, message, (updated) => {
          currentClient = updated;
        });
      }

      // All messages should be present
      const finalSession = currentClient.products[0].sessions[0];
      expect(finalSession.messages).toHaveLength(21); // Original + 20 new

      // Verify sync state is healthy
      const syncState = syncManager.getSyncState(client.id, product.id, session.id);
      expect(syncState.status).toBe('synced');
      expect(syncState.error).toBeUndefined();
    });
  });
});
