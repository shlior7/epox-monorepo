/**
 * Auth Service - Re-exports from shared visualizer-auth
 * All authentication logic lives in the shared package
 */

// Server-side auth (do not import this in client components!)
export { auth } from 'visualizer-auth/server';

// Client-side auth hooks (safe to use in client components)
export { authClient, useSession, useUser, useOrganization } from 'visualizer-auth/client';

// Middleware
export { withAuth, requireAuth } from 'visualizer-auth/middleware';

// Types
export type { User, Session, Organization, Member } from 'visualizer-auth';
