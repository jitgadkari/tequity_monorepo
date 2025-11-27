import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

// Routes that require authentication
const protectedRoutes = [
  '/',
  '/customers',
  '/subscriptions',
  '/settings',
];

// Public routes that don't require authentication
const publicRoutes = ['/admin/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow API routes (except protected admin routes)
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtectedRoute) {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      // Redirect to login if no token
      const url = new URL('/admin/login', request.url);
      return NextResponse.redirect(url);
    }

    try {
      // Verify token
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (error) {
      // Invalid token, redirect to login
      const url = new URL('/admin/login', request.url);
      const response = NextResponse.redirect(url);
      response.cookies.delete('admin-token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
