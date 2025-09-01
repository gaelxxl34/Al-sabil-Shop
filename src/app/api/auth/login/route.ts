import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/lib/auth';
import { adminAuth } from '@/lib/firebase-admin';

// Max Firebase session cookie duration = 14 days (in ms) per Firebase limits
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const SESSION_DURATION_SECONDS = SESSION_DURATION_MS / 1000;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

  // Sign in user with Firebase authentication & get ID token
  const { user, userData, token: firebaseIdToken } = await signIn(email, password);

    if (!userData) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    if (userData.isActive === false) {
      return NextResponse.json(
        { error: 'Account has been deactivated' },
        { status: 403 }
      );
    }

    // Exchange the short‑lived ID token for a Firebase session cookie (server verifiable)
    const sessionCookie = await adminAuth.createSessionCookie(firebaseIdToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    // Create a response
    const response = NextResponse.json({
      success: true,
      role: userData.role,
      displayName: userData.displayName || '',
      uid: user.uid,
      permissions: userData.permissions || [],
      message: userData.role === 'admin' ? 'Admin login successful' : 'Login successful',
      // Inform client of session duration (can implement optional renewal later)
      sessionExpiresInSeconds: SESSION_DURATION_SECONDS,
    });

    // Set secure session cookie (HTTP-only)
    response.cookies.set({
      name: 'session',
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });

    // Lightweight non-HTTP-only role cookie for quick client gating (optional)
    response.cookies.set({
      name: 'user-role',
      value: userData.role,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    
    let errorMessage = 'Authentication failed';
    let statusCode = 401;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('No account found')) {
        statusCode = 404;
      } else if (error.message.includes('deactivated')) {
        statusCode = 403;
      } else if (error.message.includes('too many requests')) {
        statusCode = 429;
      }
    }
    
  return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
