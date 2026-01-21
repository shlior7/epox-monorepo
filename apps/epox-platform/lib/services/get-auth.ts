/**
 * Server-side auth utilities for API routes
 * Gets the current user and client from the request headers
 *
 * ⚠️ SECURITY NOTICE:
 * - getServerAuthWithFallback() allows test-client fallback ONLY in development
 * - Production builds MUST have NODE_ENV=production to disable fallback
 * - Fallback attempt in production logs security violation and throws error
 * - Pre-deployment verification required to ensure fallback is unreachable
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
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user) {
      return null;
    }

    // Get the user's active organization (client)
    // The organization ID is the client ID in our data model
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
    console.error('Failed to get server auth:', error);
    return null;
  }
}

/**
 * Get auth info from request headers, with dev fallback.
 * In development, returns a test client if not authenticated.
 * In production, returns null if not authenticated.
 *
 * ⚠️ SECURITY: This function allows a fallback in development only.
 * The fallback is COMPLETELY DISABLED in production builds.
 */
export async function getServerAuthWithFallback(request: Request): Promise<ServerAuthInfo> {
  const authInfo = await getServerAuth(request);

  if (authInfo) {
    return authInfo;
  }

  // Production safety check - fail fast if somehow reached
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Double-check: production should NEVER use fallback
    console.error('🚨 SECURITY VIOLATION: Attempted to use dev fallback in production!');
    throw new Error('Unauthorized - no valid session');
  }

  // Development/test fallback - only reachable in development
  console.warn('⚠️ DEV MODE: Using fallback auth (test-client) - no session found');
  console.warn('⚠️ This fallback is DISABLED in production builds');

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
