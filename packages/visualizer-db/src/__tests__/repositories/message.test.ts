/**
 * Message Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageRepository } from '../../repositories/messages';
import { testDb } from '../setup';
import { createTestOrganization, createTestProduct, createTestClientSession } from '../helpers';
import { sql } from 'drizzle-orm';

describe('MessageRepository', () => {
  let repo: MessageRepository;
  let testChatSessionId: string;
  let testClientSessionId: string;

  beforeEach(async () => {
    repo = new MessageRepository(testDb as any);

    // Create test data
    const org = await createTestOrganization(testDb as any);
    const product = await createTestProduct(testDb as any, org.id);

    // Create a chat session
    const chatId = `chat-${Date.now()}`;
    await testDb.execute(sql`
      INSERT INTO chat_session (id, product_id, name, version, created_at, updated_at)
      VALUES (${chatId}, ${product.id}, 'Test Chat', 1, NOW(), NOW())
    `);
    testChatSessionId = chatId;

    // Create a client session
    const clientSession = await createTestClientSession(testDb as any, org.id);
    testClientSessionId = clientSession.id;
  });

  describe('create', () => {
    it('should create a message in chat session', async () => {
      const message = await repo.create(testChatSessionId, 'chat', {
        role: 'user',
        parts: [{ type: 'text', content: 'Hello!' }],
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.chatSessionId).toBe(testChatSessionId);
      expect(message.clientSessionId).toBeNull();
      expect(message.role).toBe('user');
      expect(message.parts).toEqual([{ type: 'text', content: 'Hello!' }]);
    });

    it('should create a message in client session', async () => {
      const message = await repo.create(testClientSessionId, 'client', {
        role: 'assistant',
        parts: [{ type: 'text', content: 'Hi there!' }],
      });

      expect(message.chatSessionId).toBeNull();
      expect(message.clientSessionId).toBe(testClientSessionId);
    });

    it('should create message with image parts', async () => {
      const message = await repo.create(testChatSessionId, 'chat', {
        role: 'assistant',
        parts: [
          { type: 'text', content: 'Here are your images:' },
          {
            type: 'image',
            imageIds: ['img-1', 'img-2'],
            status: 'completed',
          },
        ],
      });

      expect(message.parts.length).toBe(2);
      expect(message.parts[0].type).toBe('text');
      expect(message.parts[1].type).toBe('image');
      expect((message.parts[1] as any).imageIds).toEqual(['img-1', 'img-2']);
    });

    it('should include optional fields', async () => {
      const message = await repo.create(testChatSessionId, 'chat', {
        role: 'user',
        parts: [{ type: 'text', content: 'Generate' }],
        baseImageId: 'base-123',
        inspirationImageId: 'inspo-456',
      });

      expect(message.baseImageId).toBe('base-123');
      expect(message.inspirationImageId).toBe('inspo-456');
    });
  });

  describe('list', () => {
    it('should list messages for a chat session', async () => {
      await repo.create(testChatSessionId, 'chat', {
        role: 'user',
        parts: [{ type: 'text', content: 'First' }],
      });
      await repo.create(testChatSessionId, 'chat', {
        role: 'assistant',
        parts: [{ type: 'text', content: 'Second' }],
      });

      const messages = await repo.list(testChatSessionId, 'chat');

      expect(messages.length).toBe(2);
      expect(messages[0].parts[0]).toMatchObject({ type: 'text', content: 'First' });
      expect(messages[1].parts[0]).toMatchObject({ type: 'text', content: 'Second' });
    });

    it('should list messages for a client session', async () => {
      await repo.create(testClientSessionId, 'client', {
        role: 'user',
        parts: [{ type: 'text', content: 'Client msg' }],
      });

      const messages = await repo.list(testClientSessionId, 'client');

      expect(messages.length).toBe(1);
    });

    it('should return messages in creation order', async () => {
      for (let i = 1; i <= 5; i++) {
        await repo.create(testChatSessionId, 'chat', {
          role: 'user',
          parts: [{ type: 'text', content: `Message ${i}` }],
        });
      }

      const messages = await repo.list(testChatSessionId, 'chat');

      for (let i = 0; i < 5; i++) {
        expect((messages[i].parts[0] as any).content).toBe(`Message ${i + 1}`);
      }
    });
  });

  describe('createBatch', () => {
    it('should create multiple messages at once', async () => {
      const messages = await repo.createBatch(testChatSessionId, 'chat', [
        { role: 'user', parts: [{ type: 'text', content: 'Batch 1' }] },
        { role: 'assistant', parts: [{ type: 'text', content: 'Batch 2' }] },
        { role: 'user', parts: [{ type: 'text', content: 'Batch 3' }] },
      ]);

      expect(messages.length).toBe(3);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('user');
    });

    it('should return empty array for empty input', async () => {
      const messages = await repo.createBatch(testChatSessionId, 'chat', []);
      expect(messages).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update message parts', async () => {
      const message = await repo.create(testChatSessionId, 'chat', {
        role: 'assistant',
        parts: [
          {
            type: 'image',
            imageIds: [],
            status: 'pending',
          },
        ],
      });

      const updated = await repo.update(message.id, {
        parts: [
          {
            type: 'image',
            imageIds: ['generated-1', 'generated-2'],
            status: 'completed',
          },
        ],
      });

      expect((updated.parts[0] as any).status).toBe('completed');
      expect((updated.parts[0] as any).imageIds).toEqual(['generated-1', 'generated-2']);
    });

    it('should support optimistic locking', async () => {
      const message = await repo.create(testChatSessionId, 'chat', {
        role: 'user',
        parts: [{ type: 'text', content: 'Original' }],
      });

      // Update with correct version
      await repo.update(message.id, { parts: [{ type: 'text', content: 'V2' }] }, 1);

      // Update with stale version should fail
      await expect(
        repo.update(message.id, { parts: [{ type: 'text', content: 'V3' }] }, 1)
      ).rejects.toThrow();
    });
  });
});
