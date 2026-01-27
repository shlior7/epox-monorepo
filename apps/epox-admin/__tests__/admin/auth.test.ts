/**
 * Admin Authentication Tests
 *
 * Tests for admin login, session management, and logout functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from 'visualizer-db';
import bcrypt from 'bcrypt';

describe('Admin Authentication', () => {
  const testAdmin = {
    email: 'test-admin@epox.test',
    name: 'Test Admin',
    password: 'TestAdminPass123!',
  };

  let adminId: string;

  beforeAll(async () => {
    // Create test admin user
    const passwordHash = await bcrypt.hash(testAdmin.password, 10);
    const admin = await db.adminUsers.create(testAdmin.email, testAdmin.name, passwordHash);
    adminId = admin.id;
  });

  afterAll(async () => {
    // Clean up test admin
    if (adminId) {
      // Note: Need to add delete method to AdminUserRepository
      // For now, skip cleanup in tests
    }
  });

  describe('POST /api/admin/login', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAdmin.email,
          password: testAdmin.password,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.session).toBeDefined();
      expect(data.session.email).toBe(testAdmin.email);

      // Should set session cookie
      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('admin_session_token');
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAdmin.email,
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should reject missing email', async () => {
      const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: testAdmin.password,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject missing password', async () => {
      const response = await fetch('http://localhost:3000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAdmin.email,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/admin/session', () => {
    it('should validate valid session', async () => {
      // TODO: Implement after login returns session token
    });

    it('should reject invalid session', async () => {
      const response = await fetch('http://localhost:3000/api/admin/session', {
        headers: {
          Cookie: 'admin_session_token=invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/admin/logout', () => {
    it('should logout and clear session', async () => {
      // TODO: Implement after login/session flow is complete
    });
  });
});
