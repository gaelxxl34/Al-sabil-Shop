// src/app/api/auth/debug/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// GET /api/auth/debug - Debug authentication status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const userRole = cookieStore.get('user-role')?.value;
    
    console.log('🔍 Debug - Auth token exists:', !!authToken);
    console.log('🔍 Debug - User role cookie:', userRole);
    
    if (!authToken) {
      return NextResponse.json({
        authenticated: false,
        error: 'No auth token found',
        cookies: {
          authToken: !!authToken,
          userRole: userRole || null
        }
      });
    }

    try {
      const { payload } = await jwtVerify(authToken, JWT_SECRET);
      
      return NextResponse.json({
        authenticated: true,
        payload: {
          uid: payload.uid,
          email: payload.email,
          role: payload.role,
          displayName: payload.displayName
        },
        cookies: {
          authToken: !!authToken,
          userRole: userRole || null
        }
      });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid token',
        jwtError: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        cookies: {
          authToken: !!authToken,
          userRole: userRole || null
        }
      });
    }

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Debug endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
