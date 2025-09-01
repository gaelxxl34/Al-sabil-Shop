import { NextResponse } from 'next/server';
import { signOut } from '@/lib/auth';

export async function POST() {
  try {
    // Sign out the user from Firebase
    await signOut();

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear session cookie
    response.cookies.set({
      name: 'session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    response.cookies.set({
      name: 'user-role',
      value: '',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Expire immediately
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
