/**
 * Member Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemberRepository } from '../../repositories/members';
import { testDb } from '../setup';
import { createTestClient, createTestUser } from '../helpers';

describe('MemberRepository', () => {
  let repo: MemberRepository;
  let testClientId: string;
  let testUserId: string;

  beforeEach(async () => {
    repo = new MemberRepository(testDb as any);

    // Create test client and user
    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const user = await createTestUser(testDb as any);
    testUserId = user.id;
  });

  describe('create', () => {
    it('should create a member with default role', async () => {
      const member = await repo.create(testClientId, testUserId);

      expect(member).toBeDefined();
      expect(member.id).toBeDefined();
      expect(member.clientId).toBe(testClientId);
      expect(member.userId).toBe(testUserId);
      expect(member.role).toBe('member');
    });

    it('should create a member with custom role', async () => {
      const user2 = await createTestUser(testDb as any, { email: 'admin@test.com' });
      const member = await repo.create(testClientId, user2.id, 'admin');

      expect(member.role).toBe('admin');
    });

    it('should create a member with owner role', async () => {
      const user3 = await createTestUser(testDb as any, { email: 'owner@test.com' });
      const member = await repo.create(testClientId, user3.id, 'owner');

      expect(member.role).toBe('owner');
    });

    it('should set timestamps on creation', async () => {
      const member = await repo.create(testClientId, testUserId);

      expect(member.createdAt).toBeInstanceOf(Date);
      expect(member.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('listByClient', () => {
    it('should return all members for a client', async () => {
      const user2 = await createTestUser(testDb as any, { email: 'user2@test.com' });
      const user3 = await createTestUser(testDb as any, { email: 'user3@test.com' });

      await repo.create(testClientId, testUserId, 'owner');
      await repo.create(testClientId, user2.id, 'admin');
      await repo.create(testClientId, user3.id, 'member');

      const members = await repo.listByClient(testClientId);

      expect(members.length).toBe(3);
      expect(members.map(m => m.userId).sort()).toEqual([testUserId, user2.id, user3.id].sort());
    });

    it('should return empty array for client with no members', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'Empty Client' });
      const members = await repo.listByClient(newClient.id);

      expect(members).toEqual([]);
    });

    it('should not return members from other clients', async () => {
      const client2 = await createTestClient(testDb as any, { name: 'Other Client' });
      const user2 = await createTestUser(testDb as any, { email: 'other@test.com' });

      await repo.create(testClientId, testUserId);
      await repo.create(client2.id, user2.id);

      const members = await repo.listByClient(testClientId);

      expect(members.length).toBe(1);
      expect(members[0].clientId).toBe(testClientId);
    });
  });

  describe('listByUser', () => {
    it('should return all memberships for a user', async () => {
      const client2 = await createTestClient(testDb as any, { name: 'Client 2' });
      const client3 = await createTestClient(testDb as any, { name: 'Client 3' });

      await repo.create(testClientId, testUserId, 'owner');
      await repo.create(client2.id, testUserId, 'admin');
      await repo.create(client3.id, testUserId, 'member');

      const memberships = await repo.listByUser(testUserId);

      expect(memberships.length).toBe(3);
      expect(memberships.map(m => m.role).sort()).toEqual(['admin', 'member', 'owner']);
    });

    it('should return empty array for user with no memberships', async () => {
      const lonelyUser = await createTestUser(testDb as any, { email: 'lonely@test.com' });
      const memberships = await repo.listByUser(lonelyUser.id);

      expect(memberships).toEqual([]);
    });

    it('should not return other users memberships', async () => {
      const user2 = await createTestUser(testDb as any, { email: 'user2@test.com' });

      await repo.create(testClientId, testUserId);
      await repo.create(testClientId, user2.id);

      const memberships = await repo.listByUser(testUserId);

      expect(memberships.length).toBe(1);
      expect(memberships[0].userId).toBe(testUserId);
    });
  });

  describe('getByClientAndUser', () => {
    it('should return member for client and user combination', async () => {
      await repo.create(testClientId, testUserId, 'admin');

      const member = await repo.getByClientAndUser(testClientId, testUserId);

      expect(member).toBeDefined();
      expect(member?.clientId).toBe(testClientId);
      expect(member?.userId).toBe(testUserId);
      expect(member?.role).toBe('admin');
    });

    it('should return null when user is not member of client', async () => {
      const otherUser = await createTestUser(testDb as any, { email: 'other@test.com' });

      const member = await repo.getByClientAndUser(testClientId, otherUser.id);

      expect(member).toBeNull();
    });

    it('should return null for non-existent client', async () => {
      const member = await repo.getByClientAndUser('non-existent-client', testUserId);

      expect(member).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const member = await repo.getByClientAndUser(testClientId, 'non-existent-user');

      expect(member).toBeNull();
    });

    it('should find correct membership when user is member of multiple clients', async () => {
      const client2 = await createTestClient(testDb as any, { name: 'Client 2' });

      await repo.create(testClientId, testUserId, 'owner');
      await repo.create(client2.id, testUserId, 'member');

      const member1 = await repo.getByClientAndUser(testClientId, testUserId);
      const member2 = await repo.getByClientAndUser(client2.id, testUserId);

      expect(member1?.role).toBe('owner');
      expect(member2?.role).toBe('member');
    });
  });

  describe('getById', () => {
    it('should return member by ID', async () => {
      const created = await repo.create(testClientId, testUserId, 'admin');
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.role).toBe('admin');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });
});
