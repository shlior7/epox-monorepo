/**
 * Admin User Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdminUserRepository } from '../../repositories/admin-users';
import { testDb } from '../setup';
import { createTestId } from '../helpers';

describe('AdminUserRepository', () => {
  let repo: AdminUserRepository;

  beforeEach(async () => {
    repo = new AdminUserRepository(testDb as any);
  });

  describe('create', () => {
    it('should create an admin user', async () => {
      const email = `admin-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'Test Admin', 'hashedpassword123');

      expect(adminUser).toBeDefined();
      expect(adminUser.id).toBeDefined();
      expect(adminUser.email).toBe(email);
      expect(adminUser.name).toBe('Test Admin');
      expect(adminUser.isActive).toBe(true);
    });

    it('should set timestamps on creation', async () => {
      const email = `admin-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'Timestamp Test', 'hash');

      expect(adminUser.createdAt).toBeInstanceOf(Date);
      expect(adminUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email', async () => {
      const email = `unique-${createTestId('test')}@test.com`;
      await repo.create(email, 'First Admin', 'hash1');

      await expect(repo.create(email, 'Second Admin', 'hash2')).rejects.toThrow();
    });
  });

  describe('getByEmail', () => {
    it('should return admin user with passwordHash', async () => {
      const email = `getbyemail-${createTestId('test')}@test.com`;
      await repo.create(email, 'Email Lookup', 'secrethash');

      const found = await repo.getByEmail(email);

      expect(found).toBeDefined();
      expect(found?.email).toBe(email);
      expect(found?.passwordHash).toBe('secrethash');
    });

    it('should return null for non-existent email', async () => {
      const found = await repo.getByEmail('notfound@test.com');
      expect(found).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return admin user without passwordHash', async () => {
      const email = `getbyid-${createTestId('test')}@test.com`;
      const created = await repo.create(email, 'ID Lookup', 'secrethash');

      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('ID Lookup');
      // passwordHash should not be exposed in getById result
      expect((found as any).passwordHash).toBeUndefined();
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create admin session with token', async () => {
      const email = `session-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'Session Test', 'hash');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const session = await repo.createSession(adminUser.id, expiresAt);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.token).toBeDefined();
      expect(session.adminUserId).toBe(adminUser.id);
      expect(session.expiresAt.toISOString()).toBe(expiresAt.toISOString());
    });

    it('should include ipAddress if provided', async () => {
      const email = `session-ip-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'IP Test', 'hash');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const session = await repo.createSession(adminUser.id, expiresAt, '192.168.1.1');

      expect(session.ipAddress).toBe('192.168.1.1');
    });

    it('should include userAgent if provided', async () => {
      const email = `session-ua-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'UA Test', 'hash');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const session = await repo.createSession(adminUser.id, expiresAt, undefined, 'Mozilla/5.0');

      expect(session.userAgent).toBe('Mozilla/5.0');
    });

    it('should set timestamps', async () => {
      const email = `session-ts-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'Timestamp Test', 'hash');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const session = await repo.createSession(adminUser.id, expiresAt);

      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getSessionByToken', () => {
    it('should return session with adminUser', async () => {
      const email = `getsession-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'Token Lookup', 'hash');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const session = await repo.createSession(adminUser.id, expiresAt);

      const found = await repo.getSessionByToken(session.token);

      expect(found).toBeDefined();
      expect(found?.id).toBe(session.id);
      expect(found?.adminUser).toBeDefined();
      expect(found?.adminUser.id).toBe(adminUser.id);
      expect(found?.adminUser.email).toBe(email);
    });

    it('should return null for non-existent token', async () => {
      const found = await repo.getSessionByToken('invalid-token');
      expect(found).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      const email = `deletesession-${createTestId('test')}@test.com`;
      const adminUser = await repo.create(email, 'Delete Test', 'hash');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const session = await repo.createSession(adminUser.id, expiresAt);

      await repo.deleteSession(session.token);

      const found = await repo.getSessionByToken(session.token);
      expect(found).toBeNull();
    });

    it('should not throw for non-existent token', async () => {
      await expect(repo.deleteSession('non-existent-token')).resolves.not.toThrow();
    });
  });
});
