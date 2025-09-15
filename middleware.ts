import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Skip middleware for API routes, static files, and auth pages
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = req.cookies.get('session');
  if (!sessionCookie?.value) {
    console.log('🚫 Middleware: No session cookie, redirecting to login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // For now, we trust the session cookie exists
  // Advanced validation would require calling Firebase Admin here
  // But that could impact performance - better to do it in guards/components
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/seller/:path*', 
    '/customer/:path*'
  ],
};
