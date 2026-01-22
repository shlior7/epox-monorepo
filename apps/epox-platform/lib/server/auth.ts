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
 * Get auth info with development fallback.
 * In production, throws if not authenticated.
 */
export async function getServerComponentAuthRequired(): Promise<ServerAuthInfo> {
  const authInfo = await getServerComponentAuth();

  if (authInfo) {
    return authInfo;
  }

  // Production safety check
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    throw new Error('Unauthorized - no valid session');
  }

  // Development fallback
  console.warn('⚠️ DEV MODE: Using fallback auth (test-client) in Server Component');

  return {
    userId: 'dev-user',
    userEmail: 'dev@example.com',
    userName: 'Dev User',
    clientId: DEV_FALLBACK_CLIENT_ID,
    clientName: 'Test Client',
  };
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
