/**
 * Chat Session Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChatSessionRepository } from '../../repositories/chat-sessions';
import { MessageRepository } from '../../repositories/messages';
import { testDb } from '../setup';
import { createTestClient, createTestProduct, createTestId } from '../helpers';

describe('ChatSessionRepository', () => {
  let repo: ChatSessionRepository;
  let messageRepo: MessageRepository;
  let testClientId: string;
  let testProductId: string;

  beforeEach(async () => {
    repo = new ChatSessionRepository(testDb as any);
    messageRepo = new MessageRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const product = await createTestProduct(testDb as any, testClientId);
    testProductId = product.id;
  });

  describe('create', () => {
    it('should create a chat session with required fields', async () => {
      const session = await repo.create(testProductId, { name: 'Test Session' });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.productId).toBe(testProductId);
      expect(session.name).toBe('Test Session');
      expect(session.version).toBe(1);
    });

    it('should create session with selectedBaseImageId', async () => {
      const session = await repo.create(testProductId, {
        name: 'Session with Image',
        selectedBaseImageId: 'image-123',
      });

      expect(session.selectedBaseImageId).toBe('image-123');
    });

    it('should set timestamps on creation', async () => {
      const session = await repo.create(testProductId, { name: 'Timestamp Test' });

      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('upsertWithId', () => {
    it('should create session if not exists', async () => {
      const customId = createTestId('session');
      const session = await repo.upsertWithId(customId, testProductId, { name: 'New Session' });

      expect(session.id).toBe(customId);
      expect(session.name).toBe('New Session');
    });

    it('should update session if exists', async () => {
      const customId = createTestId('session');
      await repo.upsertWithId(customId, testProductId, { name: 'Original' });

      const updated = await repo.upsertWithId(customId, testProductId, { name: 'Updated' });

      expect(updated.id).toBe(customId);
      expect(updated.name).toBe('Updated');
      expect(updated.version).toBe(2);
    });

    it('should allow custom timestamps', async () => {
      const customId = createTestId('session');
      const customDate = new Date('2024-01-01');

      const session = await repo.upsertWithId(customId, testProductId, {
        name: 'Custom Timestamps',
        createdAt: customDate,
        updatedAt: customDate,
      });

      expect(session.createdAt.toISOString()).toBe(customDate.toISOString());
    });
  });

  describe('list', () => {
    it('should return sessions for product', async () => {
      await repo.create(testProductId, { name: 'Session 1' });
      await repo.create(testProductId, { name: 'Session 2' });
      await repo.create(testProductId, { name: 'Session 3' });

      const sessions = await repo.list(testProductId);

      expect(sessions.length).toBe(3);
    });

    it('should return empty array for product with no sessions', async () => {
      const sessions = await repo.list(testProductId);
      expect(sessions).toEqual([]);
    });

    it('should return sessions ordered by createdAt ascending', async () => {
      await repo.create(testProductId, { name: 'First' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repo.create(testProductId, { name: 'Second' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repo.create(testProductId, { name: 'Third' });

      const sessions = await repo.list(testProductId);

      for (let i = 1; i < sessions.length; i++) {
        expect(sessions[i - 1].createdAt.getTime()).toBeLessThanOrEqual(sessions[i].createdAt.getTime());
      }
    });

    it('should not return sessions from other products', async () => {
      const product2 = await createTestProduct(testDb as any, testClientId, { name: 'Product 2' });

      await repo.create(testProductId, { name: 'My Session' });
      await repo.create(product2.id, { name: 'Other Session' });

      const sessions = await repo.list(testProductId);

      expect(sessions.length).toBe(1);
      expect(sessions[0].name).toBe('My Session');
    });
  });

  describe('listByProductIds', () => {
    it('should batch fetch sessions for multiple products', async () => {
      const product2 = await createTestProduct(testDb as any, testClientId, { name: 'Product 2' });

      await repo.create(testProductId, { name: 'Session P1' });
      await repo.create(product2.id, { name: 'Session P2-1' });
      await repo.create(product2.id, { name: 'Session P2-2' });

      const sessions = await repo.listByProductIds([testProductId, product2.id]);

      expect(sessions.length).toBe(3);
    });

    it('should return empty array for empty input', async () => {
      const sessions = await repo.listByProductIds([]);
      expect(sessions).toEqual([]);
    });
  });

  describe('getWithMessages', () => {
    it('should return session with messages', async () => {
      const session = await repo.create(testProductId, { name: 'Session with Messages' });
      await messageRepo.create(session.id, 'chat', { role: 'user', parts: [{ type: 'text', content: 'Hello' }] });
      await messageRepo.create(session.id, 'chat', { role: 'assistant', parts: [{ type: 'text', content: 'Hi there!' }] });

      const result = await repo.getWithMessages(session.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Session with Messages');
      expect(result?.messages.length).toBe(2);
    });

    it('should return session with empty messages array', async () => {
      const session = await repo.create(testProductId, { name: 'No Messages' });

      const result = await repo.getWithMessages(session.id);

      expect(result).toBeDefined();
      expect(result?.messages).toEqual([]);
    });

    it('should return null for non-existent session', async () => {
      const result = await repo.getWithMessages('non-existent');
      expect(result).toBeNull();
    });

    it('should return messages ordered by createdAt', async () => {
      const session = await repo.create(testProductId, { name: 'Ordered Messages' });
      await messageRepo.create(session.id, 'chat', { role: 'user', parts: [{ type: 'text', content: 'First' }] });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await messageRepo.create(session.id, 'chat', { role: 'assistant', parts: [{ type: 'text', content: 'Second' }] });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await messageRepo.create(session.id, 'chat', { role: 'user', parts: [{ type: 'text', content: 'Third' }] });

      const result = await repo.getWithMessages(session.id);

      // Check parts content
      const getTextContent = (parts: any[] | undefined) => parts?.find((p: any) => p.type === 'text')?.content;
      expect(getTextContent(result?.messages[0].parts)).toBe('First');
      expect(getTextContent(result?.messages[1].parts)).toBe('Second');
      expect(getTextContent(result?.messages[2].parts)).toBe('Third');
    });
  });

  describe('update', () => {
    it('should update session name', async () => {
      const session = await repo.create(testProductId, { name: 'Original' });
      const updated = await repo.update(session.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
      expect(updated.version).toBe(session.version + 1);
    });

    it('should update selectedBaseImageId', async () => {
      const session = await repo.create(testProductId, { name: 'Test' });
      const updated = await repo.update(session.id, { selectedBaseImageId: 'new-image' });

      expect(updated.selectedBaseImageId).toBe('new-image');
    });

    it('should support optimistic locking', async () => {
      const session = await repo.create(testProductId, { name: 'Lock Test' });

      const updated = await repo.update(session.id, { name: 'After Update' }, session.version);
      expect(updated.name).toBe('After Update');

      await expect(repo.update(session.id, { name: 'Should Fail' }, session.version)).rejects.toThrow();
    });

    it('should throw for non-existent session', async () => {
      await expect(repo.update('non-existent', { name: 'Test' })).rejects.toThrow();
    });

    it('should update updatedAt timestamp', async () => {
      const session = await repo.create(testProductId, { name: 'Timestamp Test' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await repo.update(session.id, { name: 'New Name' });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(session.updatedAt.getTime());
    });
  });

  describe('getById', () => {
    it('should return session by ID', async () => {
      const created = await repo.create(testProductId, { name: 'Find Me' });
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a session', async () => {
      const session = await repo.create(testProductId, { name: 'To Delete' });
      await repo.delete(session.id);

      const found = await repo.getById(session.id);
      expect(found).toBeNull();
    });

    it('should throw for non-existent session', async () => {
      await expect(repo.delete('non-existent')).rejects.toThrow();
    });
  });
});
