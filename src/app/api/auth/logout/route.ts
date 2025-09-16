import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth';
import { getCookieDomain } from '@/lib/env-validation';

export async function POST() {
  try {
    // Sign out the user from Firebase
    await signOut();

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear session cookie with same parameters as when set
    response.cookies.set({
      name: 'session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 0,
      // Don't set domain for localhost in development
      ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
    });

    // Clear role cookie with same parameters as when set
    response.cookies.set({
      name: 'user-role',
      value: '',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 0,
      // Don't set domain for localhost in development
      ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
    });

  return response;
  } catch (error: unknown) {
    console.error('Logout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Logout failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
