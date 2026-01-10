import 'server-only';

import { auth } from 'visualizer-auth';
import { db } from 'visualizer-db';
import type { Session } from 'visualizer-auth';
import type { AppRole } from './roles';

function normalizeRole(role?: string | null): AppRole {
  if (role === 'admin' || role === 'owner') return 'admin';
  return 'client';
}

function getActiveClientId(session: Session | null): string | null {
  if (!session) return null;
  const legacyOrgId = (session as Session & { activeOrganizationId?: string | null }).activeOrganizationId;
  const nestedOrgId = session.session?.activeOrganizationId ?? null;
  return legacyOrgId ?? nestedOrgId;
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getSession(request: Request): Promise<Session | null> {
  return auth.api.getSession({ headers: request.headers });
}

export async function getUserRole(session: Session | null): Promise<AppRole | null> {
  if (!session) return null;

  // Check client membership for client users
  const clientId = getActiveClientId(session);
  if (!clientId) {
    return 'client';
  }

  const membership = await db.members.getByClientAndUser(clientId, session.user.id);
  return normalizeRole(membership?.role ?? 'client');
}

/**
 * Check if the given email belongs to a platform admin.
 * Platform admins are in the separate admin_user table, not the user table.
 */
export async function isAdminUser(email: string): Promise<boolean> {
  const adminUser = await db.adminUsers.getByEmail(email);
  return adminUser !== null && adminUser.isActive;
}

export async function ensureAdmin(
  session: Session
): Promise<{ error: Response } | { role: AppRole }> {
  const role = await getUserRole(session);
  if (role !== 'admin') {
    return { error: jsonError('Forbidden', 403) };
  }
  return { role };
}

export async function ensureClientAccess(
  session: Session,
  clientId?: string | null
): Promise<{ error: Response } | { role: AppRole; clientId: string | null }> {
  const role = await getUserRole(session);
  if (!role) {
    return { error: jsonError('Unauthorized', 401) };
  }

  if (role === 'admin') {
    return { role, clientId: clientId ?? getActiveClientId(session) ?? null };
  }

  const resolvedClientId = getActiveClientId(session);
  if (!resolvedClientId) {
    return { error: jsonError('Forbidden', 403) };
  }

  if (clientId && clientId !== resolvedClientId) {
    return { error: jsonError('Forbidden', 403) };
  }

  return { role, clientId: resolvedClientId };
}
