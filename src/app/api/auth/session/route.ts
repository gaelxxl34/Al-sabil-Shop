import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Session API: Starting session check...');
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      console.log('❌ Session API: No session cookie found');
      return NextResponse.json({ authenticated: false, error: 'No session found' }, { status: 401 });
    }

    console.log('🍪 Session API: Session cookie found, verifying...');
    // Verify session cookie with checkRevoked=true to ensure token is still valid
    const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    console.log('✅ Session API: Session cookie verified for user:', decoded.email);

    // Fetch Firestore profile for role validation
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ Session API: User document not found in Firestore');
      // Clear invalid session
      const response = NextResponse.json({ authenticated: false, error: 'User not found' }, { status: 401 });
      response.cookies.delete('session');
      response.cookies.delete('user-role');
      return response;
    }
    
    const userData = userDoc.data();
    console.log('📊 Session API: User data from Firestore:', {
      exists: userDoc.exists,
      role: userData?.role,
      isActive: userData?.isActive,
      email: userData?.email
    });

    if (userData && userData.isActive === false) {
      console.log('❌ Session API: User account is inactive');
      const response = NextResponse.json({ authenticated: false, error: 'Account inactive' }, { status: 401 });
      response.cookies.delete('session');
      response.cookies.delete('user-role');
      return response;
    }

    const responseData = {
      authenticated: true,
      user: {
        uid: decoded.uid,
        email: decoded.email,
        role: userData?.role || decoded.role || 'user',
        displayName: userData?.displayName || decoded.name || '',
        sellerId: userData?.sellerId || decoded.sellerId || null,
      },
      userData: {
        uid: decoded.uid,
        email: decoded.email,
        role: userData?.role || decoded.role || 'user',
        displayName: userData?.displayName || decoded.name || '',
        sellerId: userData?.sellerId || decoded.sellerId || null,
        isActive: userData?.isActive !== false,
        lastLogin: userData?.lastLogin || new Date().toISOString(),
      },
    };
    
    console.log('✅ Session API: Returning success response:', responseData);
    return NextResponse.json(responseData);
  } catch (error: unknown) {
    console.error('❌ Session validation error:', error);
    
    // Clear cookies on any session validation error
    const response = NextResponse.json(
      { authenticated: false, error: 'Session validation failed' },
      { status: 401 }
    );
    response.cookies.delete('session');
    response.cookies.delete('user-role');
    return response;
  }
}
