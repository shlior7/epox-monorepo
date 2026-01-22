/**
 * Account Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AccountRepository } from '../../repositories/accounts';
import { testDb } from '../setup';
import { createTestUser } from '../helpers';

describe('AccountRepository', () => {
  let repo: AccountRepository;
  let testUserId: string;

  beforeEach(async () => {
    repo = new AccountRepository(testDb as any);

    const user = await createTestUser(testDb as any);
    testUserId = user.id;
  });

  describe('listByUser', () => {
    it('should return all accounts for a user', async () => {
      await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash1');
      await repo.upsertPasswordForProvider(testUserId, 'google', 'hash2');

      const accounts = await repo.listByUser(testUserId);

      expect(accounts.length).toBe(2);
      expect(accounts.map((a) => a.providerId).sort()).toEqual(['credentials', 'google']);
    });

    it('should return empty array for user with no accounts', async () => {
      const newUser = await createTestUser(testDb as any, { email: 'noaccounts@test.com' });
      const accounts = await repo.listByUser(newUser.id);

      expect(accounts).toEqual([]);
    });

    it('should not return accounts from other users', async () => {
      const user2 = await createTestUser(testDb as any, { email: 'user2@test.com' });

      await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash1');
      await repo.upsertPasswordForProvider(user2.id, 'credentials', 'hash2');

      const accounts = await repo.listByUser(testUserId);

      expect(accounts.length).toBe(1);
      expect(accounts[0].userId).toBe(testUserId);
    });
  });

  describe('getByProviderAndUser', () => {
    it('should return account for user and provider', async () => {
      await repo.upsertPasswordForProvider(testUserId, 'credentials', 'testhash');

      const account = await repo.getByProviderAndUser(testUserId, 'credentials');

      expect(account).toBeDefined();
      expect(account?.userId).toBe(testUserId);
      expect(account?.providerId).toBe('credentials');
    });

    it('should return null for non-existent combination', async () => {
      const account = await repo.getByProviderAndUser(testUserId, 'google');
      expect(account).toBeNull();
    });

    it('should return null for wrong user', async () => {
      await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash');

      const user2 = await createTestUser(testDb as any, { email: 'user2@test.com' });
      const account = await repo.getByProviderAndUser(user2.id, 'credentials');

      expect(account).toBeNull();
    });

    it('should return null for wrong provider', async () => {
      await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash');

      const account = await repo.getByProviderAndUser(testUserId, 'github');
      expect(account).toBeNull();
    });
  });

  describe('upsertPasswordForProvider', () => {
    it('should create account if not exists', async () => {
      const account = await repo.upsertPasswordForProvider(testUserId, 'credentials', 'newhash');

      expect(account).toBeDefined();
      expect(account.userId).toBe(testUserId);
      expect(account.providerId).toBe('credentials');
      expect(account.password).toBe('newhash');
    });

    it('should update password if account exists', async () => {
      await repo.upsertPasswordForProvider(testUserId, 'credentials', 'originalhash');
      const updated = await repo.upsertPasswordForProvider(testUserId, 'credentials', 'newhash');

      expect(updated.password).toBe('newhash');
    });

    it('should set accountId to userId', async () => {
      const account = await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash');

      expect(account.accountId).toBe(testUserId);
    });

    it('should set timestamps', async () => {
      const account = await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash');

      expect(account.createdAt).toBeInstanceOf(Date);
      expect(account.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on update', async () => {
      const original = await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash2');

      expect(updated.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
    });

    it('should support multiple providers for same user', async () => {
      await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash1');
      await repo.upsertPasswordForProvider(testUserId, 'google', 'hash2');
      await repo.upsertPasswordForProvider(testUserId, 'github', 'hash3');

      const accounts = await repo.listByUser(testUserId);

      expect(accounts.length).toBe(3);
    });
  });

  describe('getById', () => {
    it('should return account by ID', async () => {
      const created = await repo.upsertPasswordForProvider(testUserId, 'credentials', 'hash');
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });
});
