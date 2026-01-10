/**
 * Organization Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrganizationRepository } from '../../repositories/organizations';
import { testDb } from '../setup';
import { createTestId, createTestUser } from '../helpers';

describe('OrganizationRepository', () => {
  let repo: OrganizationRepository;

  beforeEach(() => {
    repo = new OrganizationRepository(testDb as any);
  });

  describe('create', () => {
    it('should create an organization with required fields', async () => {
      const org = await repo.create({
        name: 'Test Organization',
      });

      expect(org).toBeDefined();
      expect(org.id).toBeDefined();
      expect(org.name).toBe('Test Organization');
      expect(org.slug).toBeNull();
      expect(org.version).toBe(1);
      expect(org.createdAt).toBeInstanceOf(Date);
      expect(org.updatedAt).toBeInstanceOf(Date);
    });

    it('should create an organization with all fields', async () => {
      const org = await repo.create({
        name: 'Full Organization',
        slug: 'full-org',
        logo: 'https://example.com/logo.png',
        metadata: {
          commerce: {
            platform: 'woocommerce',
            storeUrl: 'https://store.example.com',
          },
        },
      });

      expect(org.name).toBe('Full Organization');
      expect(org.slug).toBe('full-org');
      expect(org.logo).toBe('https://example.com/logo.png');
      expect(org.metadata).toEqual({
        commerce: {
          platform: 'woocommerce',
          storeUrl: 'https://store.example.com',
        },
      });
    });

    it('should generate unique IDs for each organization', async () => {
      const org1 = await repo.create({ name: 'Org 1' });
      const org2 = await repo.create({ name: 'Org 2' });

      expect(org1.id).not.toBe(org2.id);
    });
  });

  describe('getById', () => {
    it('should return organization when found', async () => {
      const created = await repo.create({ name: 'Find Me' });
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Me');
    });

    it('should return null when not found', async () => {
      const found = await repo.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('should return organization when found by slug', async () => {
      const created = await repo.create({ name: 'Slugged Org', slug: 'unique-slug' });
      const found = await repo.getBySlug('unique-slug');

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.slug).toBe('unique-slug');
    });

    it('should return null when slug not found', async () => {
      const found = await repo.getBySlug('non-existent-slug');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update organization fields', async () => {
      const created = await repo.create({ name: 'Original Name' });

      const updated = await repo.update(created.id, {
        name: 'Updated Name',
        slug: 'updated-slug',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.slug).toBe('updated-slug');
      expect(updated.version).toBe(2);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should only update provided fields', async () => {
      const created = await repo.create({
        name: 'Keep Logo',
        logo: 'original-logo.png',
      });

      const updated = await repo.update(created.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
      expect(updated.logo).toBe('original-logo.png');
    });
  });

  describe('delete', () => {
    it('should delete an existing organization', async () => {
      const created = await repo.create({ name: 'To Delete' });

      await repo.delete(created.id);

      const found = await repo.getById(created.id);
      expect(found).toBeNull();
    });

    it('should throw NotFoundError when deleting non-existent organization', async () => {
      await expect(repo.delete('non-existent-id')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should return all organizations', async () => {
      await repo.create({ name: 'Org A' });
      await repo.create({ name: 'Org B' });
      await repo.create({ name: 'Org C' });

      const orgs = await repo.list();

      expect(orgs.length).toBeGreaterThanOrEqual(3);
      expect(orgs.some((o) => o.name === 'Org A')).toBe(true);
      expect(orgs.some((o) => o.name === 'Org B')).toBe(true);
      expect(orgs.some((o) => o.name === 'Org C')).toBe(true);
    });
  });
});
