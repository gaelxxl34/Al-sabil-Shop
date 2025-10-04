import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

// Force Node.js runtime for middleware (firebase-admin requires Node.js APIs)
export const runtime = 'nodejs';

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

  // Quick validation of session cookie format
  try {
    // Verify the session cookie is valid (this will throw if invalid/expired)
    await adminAuth.verifySessionCookie(sessionCookie.value, true);
    console.log('✅ Middleware: Session cookie verified');
  } catch (error) {
    console.log('❌ Middleware: Invalid session cookie, redirecting to login');
    // Clear invalid cookies and redirect
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('session');
    response.cookies.delete('user-role');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/seller/:path*', 
    '/customer/:path*'
  ],
};
