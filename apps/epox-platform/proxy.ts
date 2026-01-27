import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Public routes that don't require authentication.
 * All other routes will redirect to /login if not authenticated.
 */
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];

/**
 * Auth routes - redirect to dashboard if already authenticated.
 */
const AUTH_PATHS = ['/login', '/signup'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session cookie using Better Auth's helper
  const sessionCookie = getSessionCookie(request);

  // getSessionCookie returns the cookie value directly (string), not an object
  const hasSession = !!sessionCookie;

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_IS_E2E !== 'true') {
    console.log('[Proxy]', {
      pathname,
      hasSessionCookie: !!sessionCookie,
      sessionCookieType: typeof sessionCookie,
      hasSession,
    });
  }

  // Check if this is a public path
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check if this is an auth path (login/signup)
  const isAuthPath = AUTH_PATHS.some((path) => pathname === path);

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuthPath && hasSession) {
    console.log('[Proxy] Redirecting authenticated user to /home');
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Allow access to public paths without authentication
  if (isPublicPath) {
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!hasSession) {
    console.log('[Proxy] No session, redirecting to /login from:', pathname);
    const loginUrl = new URL('/login', request.url);
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they have their own auth via withSecurity)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
