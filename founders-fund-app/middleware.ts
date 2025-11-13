import { withAuth } from 'next-auth/middleware';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Security headers middleware
function applySecurityHeaders(response: NextResponse) {
  // Security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy (adjust as needed for your app)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Adjust for production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'self'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Public routes that don't require authentication
    const publicPaths = [
      '/auth/signin',
      '/api/auth',
      '/api/healthz',
    ];

    // Check if this is a public route
    const isPublicRoute = publicPaths.some((p) => path.startsWith(p));

    // Allow public routes without authentication
    if (isPublicRoute) {
      return applySecurityHeaders(NextResponse.next());
    }

    // All other routes require authentication
    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', path);
      const response = NextResponse.redirect(signInUrl);
      return applySecurityHeaders(response);
    }

    // Admin routes require ADMIN role
    if ((path.startsWith('/admin') || path.startsWith('/api/admin')) && token.role !== 'ADMIN') {
      const response = NextResponse.redirect(new URL('/', req.url));
      return applySecurityHeaders(response);
    }

    return applySecurityHeaders(NextResponse.next());
  },
  {
    callbacks: {
      // Require authentication for all routes except public paths
      authorized: ({ token }) => !!token,
    },
  },
);

// Specify which routes should be protected by middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
