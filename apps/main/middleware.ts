import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Session cookie name
const SESSION_COOKIE_NAME = 'tequity_session';

// Public routes (no auth required)
const publicRoutes = [
  '/signin',
  '/signup',
  '/verify-email',
];

// Platform routes requiring session auth (cookie-based)
const platformProtectedRoutes = [
  '/onboarding',
  '/workspace-setup',
  '/pricing',
  '/checkout',
  '/workspaces',
  '/billing',
  '/account',
];

// Public API patterns (no auth required)
const publicApiPatterns = [
  /^\/api\/auth\/(signup|signin|verify-otp|session|logout|resend-otp)$/,
  /^\/api\/[^/]+\/auth\/signup$/,
  /^\/api\/[^/]+\/auth\/verify-signup$/,
  /^\/api\/[^/]+\/auth\/send-code$/,
  /^\/api\/[^/]+\/auth\/verify-code$/,
  /^\/api\/health$/,
  /^\/api\/admin\//, // Admin routes use their own auth (x-admin-secret)
  /^\/api\/platform\/provision$/, // Provisioning can be called internally
];

// Check if path matches any public API pattern
function isPublicApi(pathname: string): boolean {
  return publicApiPatterns.some((regex) => regex.test(pathname));
}

// Check if path is a public route
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname.startsWith(route));
}

// Check if path is a platform protected route
function isPlatformProtectedRoute(pathname: string): boolean {
  return platformProtectedRoutes.some((route) => pathname.startsWith(route));
}

// Check if path is a tenant route (starts with /[slug])
function isTenantRoute(pathname: string): boolean {
  // Tenant routes are like /acme/dashboard, /acme/projects, etc.
  // Exclude known platform paths
  const firstSegment = pathname.split('/')[1];
  if (!firstSegment) return false;

  const platformPaths = [
    'api', 'signin', 'signup', 'verify-email',
    'onboarding', 'workspace-setup', 'pricing', 'checkout', 'workspaces',
    'billing', 'account', '_next', 'static', 'favicon.ico'
  ];

  return !platformPaths.includes(firstSegment);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // API routes handling
  if (pathname.startsWith('/api/')) {
    // Allow public API routes
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }

    // Platform API routes - check session cookie
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/platform/')) {
      if (!sessionCookie?.value) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', code: 'NO_SESSION' },
          { status: 401 }
        );
      }
      return NextResponse.next();
    }

    // Tenant API routes - check Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'NO_AUTH_HEADER' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // Page routes handling

  // Public routes - redirect to workspaces if already authenticated
  if (isPublicRoute(pathname)) {
    if (sessionCookie?.value) {
      return NextResponse.redirect(new URL('/workspaces', request.url));
    }
    return NextResponse.next();
  }

  // Platform protected routes - require session
  if (isPlatformProtectedRoute(pathname)) {
    if (!sessionCookie?.value) {
      const signinUrl = new URL('/signin', request.url);
      signinUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signinUrl);
    }
    return NextResponse.next();
  }

  // Tenant routes - check session and membership
  if (isTenantRoute(pathname)) {
    // For tenant routes, we need session cookie
    // Membership verification is done in the layout/page
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
