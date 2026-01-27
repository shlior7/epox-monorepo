/**
 * Server-side auth utilities for Server Components
 * Gets the current user and client from cookies/headers
 */

import { headers, cookies } from 'next/headers';
import { auth } from '../services/auth';
import { db } from '../services/db';

export interface ServerAuthInfo {
  userId: string;
  userEmail: string;
  userName: string;
  clientId: string;
  clientName?: string;
}

const DEV_FALLBACK_CLIENT_ID = 'test-client';

/**
 * Get auth info in a Server Component.
 * Returns null if not authenticated.
 */
export async function getServerComponentAuth(): Promise<ServerAuthInfo | null> {
  try {
    // PRIORITY 1: Query session table directly for activeClientId
    // This works for test sessions created directly in the database
    const sessionData = await getSessionFromDatabase();

    if (sessionData) {
      return sessionData;
    }

    // PRIORITY 2: Use Better Auth API (for production sessions)
    const headersList = await headers();

    // Create a Headers object from the headers list
    const requestHeaders = new Headers();
    headersList.forEach((value, key) => {
      requestHeaders.set(key, value);
    });

    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user) {
      return null;
    }

    // Get the user's active organization (client)
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
    console.error('Failed to get server component auth:', error);
    return null;
  }
}

/**
 * Get auth info with E2E test fallback.
 * In production and development, redirects to /login if not authenticated.
 * Only uses fallback in E2E tests.
 */
export async function getServerComponentAuthRequired(): Promise<ServerAuthInfo> {
  const authInfo = await getServerComponentAuth();

  if (authInfo) {
    return authInfo;
  }

  // Only use fallback in E2E tests
  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === 'true';

  if (!isE2E) {
    // Import redirect dynamically to avoid circular dependencies
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  // E2E test fallback only
  console.warn('⚠️ E2E MODE: Using fallback auth (test-client) in Server Component');

  return {
    userId: 'dev-user',
    userEmail: 'dev@example.com',
    userName: 'Dev User',
    clientId: DEV_FALLBACK_CLIENT_ID,
    clientName: 'Test Client',
  };
}

/**
 * Get full session data from the database directly.
 * This is needed because test sessions are created directly in the database,
 * bypassing Better Auth's API.
 */
async function getSessionFromDatabase(): Promise<ServerAuthInfo | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('better-auth.session_token')?.value;

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
 */
async function getActiveOrganization(userId: string): Promise<{ id: string; name: string } | null> {
  try {
    const members = await db.members.listByUser(userId);

    if (members.length === 0) {
      return null;
    }

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
