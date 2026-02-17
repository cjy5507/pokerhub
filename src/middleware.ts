import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

// Define protected routes
const protectedRoutes = [
  '/profile',
  '/board/*/write',
  '/hands/share',
  '/attendance',
  '/admin',
];

// Define admin-only routes
const adminRoutes = ['/admin'];

// Define auth routes (redirect if already logged in)
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session
  const session = await getSession();

  // Check if route is protected
  const isProtected = protectedRoutes.some((route) =>
    pathname.match(new RegExp(`^${route.replace('*', '.*')}$`))
  );

  // Check if route is admin-only
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Check if route is auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect to login if trying to access protected route without session
  if (isProtected && !session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect to home if admin route and not admin
  if (isAdminRoute && (!session || session.role !== 'admin')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect to home if already logged in and trying to access auth routes
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Add user to request headers for server components
  if (session) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-email', session.email);
    requestHeaders.set('x-user-nickname', encodeURIComponent(session.nickname));
    requestHeaders.set('x-user-role', session.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
