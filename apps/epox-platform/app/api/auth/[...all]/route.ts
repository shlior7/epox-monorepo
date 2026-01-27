/**
 * Better Auth API Route
 *
 * This catch-all route handles all authentication operations:
 * - Sign up
 * - Sign in
 * - Sign out
 * - Session management
 * - Password reset
 * - OAuth flows
 */

import { auth } from 'visualizer-auth/server';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
