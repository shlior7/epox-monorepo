/**
 * Secure error handling utilities
 * Prevents leaking internal error details to clients
 */

import { NextResponse } from 'next/server';

/**
 * Returns a safe error response that doesn't leak internal details
 * In development, includes the error message for debugging
 * In production, returns a generic message
 */
export function internalServerErrorResponse(error: unknown): NextResponse {
  // Log the actual error for debugging
  console.error('Internal error:', error);

  // In production or test, return generic message
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

  // In development, include error details for debugging
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  return NextResponse.json({ error: message }, { status: 500 });
}
