/**
 * Invitation Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InvitationRepository } from '../../repositories/invitations';
import { testDb } from '../setup';
import { createTestClient, createTestUser } from '../helpers';

describe('InvitationRepository', () => {
  let repo: InvitationRepository;
  let testClientId: string;
  let testInviterId: string;

  beforeEach(async () => {
    repo = new InvitationRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const inviter = await createTestUser(testDb as any);
    testInviterId = inviter.id;
  });

  describe('create', () => {
    it('should create an invitation with required fields', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const invitation = await repo.create({
        clientId: testClientId,
        email: 'invitee@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      expect(invitation).toBeDefined();
      expect(invitation.id).toBeDefined();
      expect(invitation.clientId).toBe(testClientId);
      expect(invitation.email).toBe('invitee@test.com');
      expect(invitation.status).toBe('pending');
      expect(invitation.inviterId).toBe(testInviterId);
    });

    it('should create invitation with role', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invitation = await repo.create({
        clientId: testClientId,
        email: 'admin@test.com',
        role: 'admin',
        expiresAt,
        inviterId: testInviterId,
      });

      expect(invitation.role).toBe('admin');
    });

    it('should default role to null', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invitation = await repo.create({
        clientId: testClientId,
        email: 'member@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      expect(invitation.role).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return invitation for client and email', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await repo.create({
        clientId: testClientId,
        email: 'find@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      const found = await repo.getByEmail('find@test.com', testClientId);

      expect(found).toBeDefined();
      expect(found?.email).toBe('find@test.com');
    });

    it('should return null for non-existent invitation', async () => {
      const found = await repo.getByEmail('notfound@test.com', testClientId);
      expect(found).toBeNull();
    });

    it('should not return invitation for different client', async () => {
      const client2 = await createTestClient(testDb as any, { name: 'Other Client' });
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await repo.create({
        clientId: client2.id,
        email: 'other@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      const found = await repo.getByEmail('other@test.com', testClientId);
      expect(found).toBeNull();
    });
  });

  describe('getPendingByEmail', () => {
    it('should return pending non-expired invitation', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await repo.create({
        clientId: testClientId,
        email: 'pending@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      const found = await repo.getPendingByEmail('pending@test.com');

      expect(found).toBeDefined();
      expect(found?.email).toBe('pending@test.com');
      expect(found?.status).toBe('pending');
    });

    it('should return null for expired invitation', async () => {
      const expiresAt = new Date(Date.now() - 1000); // Already expired
      await repo.create({
        clientId: testClientId,
        email: 'expired@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      const found = await repo.getPendingByEmail('expired@test.com');
      expect(found).toBeNull();
    });

    it('should return null for accepted invitation', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invitation = await repo.create({
        clientId: testClientId,
        email: 'accepted@test.com',
        expiresAt,
        inviterId: testInviterId,
      });
      await repo.accept(invitation.id);

      const found = await repo.getPendingByEmail('accepted@test.com');
      expect(found).toBeNull();
    });
  });

  describe('listByClient', () => {
    it('should return all invitations for client', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await repo.create({ clientId: testClientId, email: 'inv1@test.com', expiresAt, inviterId: testInviterId });
      await repo.create({ clientId: testClientId, email: 'inv2@test.com', expiresAt, inviterId: testInviterId });
      await repo.create({ clientId: testClientId, email: 'inv3@test.com', expiresAt, inviterId: testInviterId });

      const invitations = await repo.listByClient(testClientId);

      expect(invitations.length).toBe(3);
    });

    it('should return empty array for client with no invitations', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'Empty Client' });
      const invitations = await repo.listByClient(newClient.id);

      expect(invitations).toEqual([]);
    });
  });

  describe('listPendingByClient', () => {
    it('should return only pending non-expired invitations', async () => {
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const pastExpiry = new Date(Date.now() - 1000);

      await repo.create({ clientId: testClientId, email: 'pending1@test.com', expiresAt: futureExpiry, inviterId: testInviterId });
      await repo.create({ clientId: testClientId, email: 'pending2@test.com', expiresAt: futureExpiry, inviterId: testInviterId });
      await repo.create({ clientId: testClientId, email: 'expired@test.com', expiresAt: pastExpiry, inviterId: testInviterId });

      const accepted = await repo.create({
        clientId: testClientId,
        email: 'accepted@test.com',
        expiresAt: futureExpiry,
        inviterId: testInviterId,
      });
      await repo.accept(accepted.id);

      const pendingInvitations = await repo.listPendingByClient(testClientId);

      expect(pendingInvitations.length).toBe(2);
      expect(pendingInvitations.every((i) => i.status === 'pending')).toBe(true);
    });
  });

  describe('accept', () => {
    it('should update status to accepted', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invitation = await repo.create({
        clientId: testClientId,
        email: 'toacc@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      const accepted = await repo.accept(invitation.id);

      expect(accepted.status).toBe('accepted');
    });

    it('should throw for non-existent invitation', async () => {
      await expect(repo.accept('non-existent')).rejects.toThrow();
    });
  });

  describe('revoke', () => {
    it('should update status to revoked', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const invitation = await repo.create({
        clientId: testClientId,
        email: 'torevoke@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      const revoked = await repo.revoke(invitation.id);

      expect(revoked.status).toBe('revoked');
    });

    it('should throw for non-existent invitation', async () => {
      await expect(repo.revoke('non-existent')).rejects.toThrow();
    });
  });

  describe('expireOld', () => {
    it('should expire old pending invitations', async () => {
      const pastExpiry = new Date(Date.now() - 1000);
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await repo.create({ clientId: testClientId, email: 'old1@test.com', expiresAt: pastExpiry, inviterId: testInviterId });
      await repo.create({ clientId: testClientId, email: 'old2@test.com', expiresAt: pastExpiry, inviterId: testInviterId });
      await repo.create({ clientId: testClientId, email: 'fresh@test.com', expiresAt: futureExpiry, inviterId: testInviterId });

      const expiredCount = await repo.expireOld();

      expect(expiredCount).toBe(2);
    });

    it('should return 0 when no invitations to expire', async () => {
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await repo.create({ clientId: testClientId, email: 'fresh@test.com', expiresAt: futureExpiry, inviterId: testInviterId });

      const expiredCount = await repo.expireOld();

      expect(expiredCount).toBe(0);
    });

    it('should not expire already accepted invitations', async () => {
      const pastExpiry = new Date(Date.now() - 1000);
      const invitation = await repo.create({
        clientId: testClientId,
        email: 'accepted@test.com',
        expiresAt: pastExpiry,
        inviterId: testInviterId,
      });
      await repo.accept(invitation.id);

      const expiredCount = await repo.expireOld();

      expect(expiredCount).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return invitation by ID', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const created = await repo.create({
        clientId: testClientId,
        email: 'findme@test.com',
        expiresAt,
        inviterId: testInviterId,
      });

      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.email).toBe('findme@test.com');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });
});
