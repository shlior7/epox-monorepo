/**
 * Server-side auth utilities for API routes
 * Gets the current user and client from the request headers
 *
 * ⚠️ SECURITY NOTICE:
 * - getServerAuthWithFallback() allows test-client fallback ONLY in E2E tests
 * - Fallback is DISABLED in production AND development
 * - Only active when NEXT_PUBLIC_IS_E2E=true
 * - Production and development builds throw error if not authenticated
 */

import { auth } from './auth';
import { db } from './db';

// ===== Types =====

export interface ServerAuthInfo {
  userId: string;
  userEmail: string;
  userName: string;
  clientId: string;
  clientName?: string;
}

// ===== Development Fallback =====

const DEV_FALLBACK_CLIENT_ID = 'test-client';

/**
 * Get auth info from request headers.
 * Returns null if not authenticated.
 */
export async function getServerAuth(request: Request): Promise<ServerAuthInfo | null> {
  try {
    // PRIORITY 1: Query session table directly for activeClientId
    // This works for test sessions created directly in the database
    const sessionData = await getSessionFromDatabase(request);

    if (sessionData) {
      return sessionData;
    }

    // PRIORITY 2: Use Better Auth API (for production sessions)
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return null;
    }

    // Get the user's active organization (client) from members table
    const activeOrg = await getActiveOrganization(session.user.id);

    if (!activeOrg) {
      return null;
    }

    return {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      clientId: activeOrg.id,
      clientName: activeOrg.name,
    };
  } catch (error) {
    console.error('[getServerAuth] Failed to get server auth:', error);
    return null;
  }
}

/**
 * Get auth info from request headers, with E2E test fallback.
 * In production and development, throws if not authenticated.
 * Only uses fallback in E2E tests.
 *
 * ⚠️ SECURITY: This function allows a fallback in E2E tests only.
 * The fallback is COMPLETELY DISABLED in production and development builds.
 */
export async function getServerAuthWithFallback(request: Request): Promise<ServerAuthInfo> {
  const authInfo = await getServerAuth(request);

  if (authInfo) {
    return authInfo;
  }

  // Defense-in-depth: Block fallback in production (even if E2E flag is accidentally set)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Unauthorized - no valid session');
  }

  // Only use fallback in E2E tests
  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';

  if (!isE2E) {
    throw new Error('Unauthorized - no valid session');
  }

  // E2E test fallback only
  console.warn('⚠️ E2E MODE: Using fallback auth (test-client) - no session found');

  return {
    userId: 'dev-user',
    userEmail: 'dev@example.com',
    userName: 'Dev User',
    clientId: DEV_FALLBACK_CLIENT_ID,
    clientName: 'Test Client',
  };
}

/**
 * Get the required client ID from request, with dev fallback.
 * Use this in API routes where you need the client ID.
 */
export async function getClientId(request: Request): Promise<string> {
  const authInfo = await getServerAuthWithFallback(request);
  return authInfo.clientId;
}

/**
 * Get full session data from the database directly.
 * This is needed because test sessions are created directly in the database,
 * bypassing Better Auth's API.
 */
async function getSessionFromDatabase(request: Request): Promise<ServerAuthInfo | null> {
  try {
    // Extract session token from cookie
    const cookieHeader = request.headers.get('cookie');

    if (!cookieHeader) {
      return null;
    }

    const sessionToken = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('better-auth.session_token='))
      ?.split('=')[1];

    if (!sessionToken) {
      return null;
    }

    // Query session table directly using Drizzle
    const { getDb } = await import('visualizer-db');
    const { session, user } = await import('visualizer-db/schema');
    const { eq, and, gt } = await import('drizzle-orm');

    const dbInstance = getDb();

    // Join session with user to get full user data
    const sessions = await dbInstance
      .select({
        userId: session.userId,
        activeClientId: session.activeClientId,
        userName: user.name,
        userEmail: user.email,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(and(eq(session.token, sessionToken), gt(session.expiresAt, new Date())))
      .limit(1);

    if (sessions.length === 0) {
      return null;
    }

    const sessionRow = sessions[0];

    if (!sessionRow.activeClientId) {
      return null;
    }

    // Get client info
    const client = await db.clients.getById(sessionRow.activeClientId);

    return {
      userId: sessionRow.userId,
      userEmail: sessionRow.userEmail,
      userName: sessionRow.userName,
      clientId: sessionRow.activeClientId,
      clientName: client?.name,
    };
  } catch (error) {
    console.error('[getSessionFromDatabase] Failed to get session:', error);
    return null;
  }
}

/**
 * Get the active organization for a user.
 * In our data model, organization = client.
 */
async function getActiveOrganization(userId: string): Promise<{ id: string; name: string } | null> {
  try {
    // Try to get the member's client through the members table
    const members = await db.members.listByUser(userId);

    if (members.length === 0) {
      return null;
    }

    // Get the first client the user is a member of
    const firstMember = members[0];
    const client = await db.clients.getById(firstMember.clientId);

    if (!client) {
      return null;
    }

    return {
      id: client.id,
      name: client.name,
    };
  } catch (error) {
    console.error('Failed to get active organization:', error);
    return null;
  }
}
