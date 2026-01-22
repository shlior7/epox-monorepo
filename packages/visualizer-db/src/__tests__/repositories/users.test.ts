/**
 * User Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserRepository } from '../../repositories/users';
import { testDb } from '../setup';

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(async () => {
    repo = new UserRepository(testDb as any);
  });

  describe('create', () => {
    it('should create a user with required fields', async () => {
      const user = await repo.create({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.emailVerified).toBe(false);
      expect(user.image).toBeNull();
    });

    it('should create a user with all fields', async () => {
      const user = await repo.create({
        email: 'full@example.com',
        name: 'Full User',
        emailVerified: true,
        image: 'https://example.com/avatar.png',
      });

      expect(user.email).toBe('full@example.com');
      expect(user.name).toBe('Full User');
      expect(user.emailVerified).toBe(true);
      expect(user.image).toBe('https://example.com/avatar.png');
    });

    it('should create user with emailVerified defaulting to false', async () => {
      const user = await repo.create({
        email: 'unverified@example.com',
        name: 'Unverified User',
      });

      expect(user.emailVerified).toBe(false);
    });

    it('should enforce unique email constraint', async () => {
      await repo.create({ email: 'unique@example.com', name: 'First' });

      await expect(repo.create({ email: 'unique@example.com', name: 'Second' })).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return user by ID', async () => {
      const created = await repo.create({ email: 'findme@example.com', name: 'Find Me' });
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('findme@example.com');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return user by email', async () => {
      await repo.create({ email: 'lookup@example.com', name: 'Lookup User' });
      const found = await repo.getByEmail('lookup@example.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe('lookup@example.com');
      expect(found?.name).toBe('Lookup User');
    });

    it('should return null for non-existent email', async () => {
      const found = await repo.getByEmail('notfound@example.com');
      expect(found).toBeNull();
    });

    it('should be case sensitive for email lookup', async () => {
      await repo.create({ email: 'CaseSensitive@Example.com', name: 'Case User' });

      const found = await repo.getByEmail('CaseSensitive@Example.com');
      const notFound = await repo.getByEmail('casesensitive@example.com');

      expect(found).toBeDefined();
      expect(notFound).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user name', async () => {
      const created = await repo.create({ email: 'update@example.com', name: 'Original' });
      const updated = await repo.update(created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe('update@example.com'); // unchanged
    });

    it('should update user email', async () => {
      const created = await repo.create({ email: 'oldemail@example.com', name: 'Email Update' });
      const updated = await repo.update(created.id, { email: 'newemail@example.com' });

      expect(updated.email).toBe('newemail@example.com');
    });

    it('should update emailVerified status', async () => {
      const created = await repo.create({ email: 'verify@example.com', name: 'Verify Me' });
      expect(created.emailVerified).toBe(false);

      const updated = await repo.update(created.id, { emailVerified: true });
      expect(updated.emailVerified).toBe(true);
    });

    it('should update image', async () => {
      const created = await repo.create({ email: 'image@example.com', name: 'Image User' });
      const updated = await repo.update(created.id, { image: 'https://example.com/new-avatar.png' });

      expect(updated.image).toBe('https://example.com/new-avatar.png');
    });

    it('should update multiple fields at once', async () => {
      const created = await repo.create({ email: 'multi@example.com', name: 'Multi Update' });
      const updated = await repo.update(created.id, {
        name: 'New Name',
        emailVerified: true,
        image: 'https://example.com/avatar.png',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.emailVerified).toBe(true);
      expect(updated.image).toBe('https://example.com/avatar.png');
    });

    it('should return existing user when no fields to update', async () => {
      const created = await repo.create({ email: 'noop@example.com', name: 'No Op' });
      const result = await repo.update(created.id, {});

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('No Op');
    });

    it('should throw for non-existent user', async () => {
      await expect(repo.update('non-existent', { name: 'Test' })).rejects.toThrow();
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repo.create({ email: 'timestamp@example.com', name: 'Timestamp' });

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await repo.update(created.id, { name: 'New Name' });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });
  });
});
