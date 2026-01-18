/**
 * Auth Service - Re-exports from shared visualizer-auth
 * All authentication logic lives in the shared package
 */

// Re-export everything from the shared auth package
export { auth } from 'visualizer-auth';
export { authClient, useSession, useUser, useOrganization } from 'visualizer-auth';
export { withAuth, requireAuth } from 'visualizer-auth';
export type { User, Session, Organization, Member } from 'visualizer-auth';
