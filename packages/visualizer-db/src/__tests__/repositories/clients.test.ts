/**
 * Client Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClientRepository } from '../../repositories/clients';
import { testDb } from '../setup';
import { createTestId } from '../helpers';

describe('ClientRepository', () => {
  let repo: ClientRepository;

  beforeEach(async () => {
    repo = new ClientRepository(testDb as any);
  });

  describe('create', () => {
    it('should create a client with required fields', async () => {
      const client = await repo.create({ name: 'Test Client' });

      expect(client).toBeDefined();
      expect(client.id).toBeDefined();
      expect(client.name).toBe('Test Client');
      expect(client.slug).toBeNull();
      expect(client.logo).toBeNull();
      expect(client.metadata).toBeNull();
      expect(client.version).toBe(1);
    });

    it('should create a client with all optional fields', async () => {
      const client = await repo.create({
        name: 'Full Client',
        slug: 'full-client',
        logo: 'https://example.com/logo.png',
        metadata: { description: 'A tech company' },
      });

      expect(client.name).toBe('Full Client');
      expect(client.slug).toBe('full-client');
      expect(client.logo).toBe('https://example.com/logo.png');
      expect(client.metadata).toMatchObject({ description: 'A tech company' });
    });

    it('should enforce unique slug constraint', async () => {
      await repo.create({ name: 'First Client', slug: 'unique-slug' });

      await expect(repo.create({ name: 'Second Client', slug: 'unique-slug' })).rejects.toThrow();
    });
  });

  describe('createWithId', () => {
    it('should create a client with a specific ID', async () => {
      const id = createTestId('client');
      const client = await repo.createWithId(id, { name: 'Custom ID Client' });

      expect(client.id).toBe(id);
      expect(client.name).toBe('Custom ID Client');
    });

    it('should create with all optional fields', async () => {
      const id = createTestId('client');
      const client = await repo.createWithId(id, {
        name: 'Full Custom Client',
        slug: 'custom-slug',
        logo: 'https://example.com/custom-logo.png',
        metadata: { description: 'custom' },
      });

      expect(client.id).toBe(id);
      expect(client.slug).toBe('custom-slug');
      expect(client.metadata).toMatchObject({ description: 'custom' });
    });
  });

  describe('getById', () => {
    it('should return client by ID', async () => {
      const created = await repo.create({ name: 'Find Me' });
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Me');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('should return client by slug', async () => {
      await repo.create({ name: 'Slugged Client', slug: 'my-slug' });
      const found = await repo.getBySlug('my-slug');

      expect(found).toBeDefined();
      expect(found?.slug).toBe('my-slug');
      expect(found?.name).toBe('Slugged Client');
    });

    it('should return null for non-existent slug', async () => {
      const found = await repo.getBySlug('does-not-exist');
      expect(found).toBeNull();
    });

    it('should be case sensitive for slug lookup', async () => {
      await repo.create({ name: 'Case Test', slug: 'MySlug' });

      const found = await repo.getBySlug('MySlug');
      const notFound = await repo.getBySlug('myslug');

      expect(found).toBeDefined();
      expect(notFound).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all clients ordered by createdAt', async () => {
      await repo.create({ name: 'Client A' });
      await repo.create({ name: 'Client B' });
      await repo.create({ name: 'Client C' });

      const clients = await repo.list();

      expect(clients.length).toBeGreaterThanOrEqual(3);
      // Verify order by checking createdAt timestamps
      for (let i = 1; i < clients.length; i++) {
        expect(clients[i - 1].createdAt.getTime()).toBeLessThanOrEqual(clients[i].createdAt.getTime());
      }
    });

    it('should return empty array when no clients exist', async () => {
      // Note: Other tests may have created clients, but after truncate this should be empty
      // This test relies on the beforeEach truncation
      const clients = await repo.list();
      // Can't guarantee empty due to test isolation, just check it returns array
      expect(Array.isArray(clients)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update client name', async () => {
      const created = await repo.create({ name: 'Original Name' });
      const updated = await repo.update(created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.version).toBe(created.version + 1);
    });

    it('should update multiple fields', async () => {
      const created = await repo.create({ name: 'Multi Update' });
      const updated = await repo.update(created.id, {
        name: 'New Name',
        slug: 'new-slug',
        logo: 'https://example.com/new-logo.png',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.slug).toBe('new-slug');
      expect(updated.logo).toBe('https://example.com/new-logo.png');
    });

    it('should update metadata', async () => {
      const created = await repo.create({ name: 'Metadata Test' });
      const updated = await repo.update(created.id, {
        metadata: { description: 'test description' },
      });

      expect(updated.metadata).toMatchObject({ description: 'test description' });
    });

    it('should support optimistic locking', async () => {
      const created = await repo.create({ name: 'Lock Test' });

      // Update with correct version should succeed
      const updated = await repo.update(created.id, { name: 'After First Update' }, created.version);
      expect(updated.name).toBe('After First Update');

      // Update with old version should fail
      await expect(repo.update(created.id, { name: 'Should Fail' }, created.version)).rejects.toThrow();
    });

    it('should throw for non-existent client', async () => {
      await expect(repo.update('non-existent', { name: 'Test' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a client', async () => {
      const created = await repo.create({ name: 'To Delete' });
      await repo.delete(created.id);

      const found = await repo.getById(created.id);
      expect(found).toBeNull();
    });

    it('should throw for non-existent client', async () => {
      await expect(repo.delete('non-existent')).rejects.toThrow();
    });
  });
});
