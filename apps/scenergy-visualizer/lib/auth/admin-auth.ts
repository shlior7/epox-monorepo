import 'server-only';

import { db } from 'visualizer-db';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

const ADMIN_SESSION_COOKIE = 'admin_session_token';
const SESSION_DURATION_DAYS = 7;

export interface AdminAuthSession {
  id: string;
  email: string;
  name: string;
  token: string;
}

/**
 * Authenticate an admin user with email/password
 */
export async function loginAdmin(email: string, password: string): Promise<AdminAuthSession | null> {
  const adminUser = await db.adminUsers.getByEmail(email);

  if (!adminUser || !adminUser.isActive) {
    return null;
  }

  // Verify password
  const isValid = await bcrypt.compare(password, adminUser.passwordHash);
  if (!isValid) {
    return null;
  }

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await db.adminUsers.createSession(adminUser.id, expiresAt);

  // Set cookie
  (await cookies()).set(ADMIN_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
  });

  return {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    token: session.token,
  };
}

/**
 * Get the current admin session from cookies
 */
export async function getAdminSession(): Promise<AdminAuthSession | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await db.adminUsers.getSessionByToken(token);

  if (!session) {
    return null;
  }

  if (!session.adminUser.isActive) {
    await db.adminUsers.deleteSession(token);
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    await db.adminUsers.deleteSession(token);
    return null;
  }

  return {
    id: session.adminUser.id,
    email: session.adminUser.email,
    name: session.adminUser.name,
    token: session.token,
  };
}

/**
 * Logout the current admin user
 */
export async function logoutAdmin(): Promise<void> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await db.adminUsers.deleteSession(token);
  }

  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}

/**
 * Middleware to require admin authentication
 */
export async function requireAdminAuth(): Promise<AdminAuthSession> {
  const session = await getAdminSession();

  if (!session) {
    throw new Error('Unauthorized - Admin authentication required');
  }

  return session;
}
