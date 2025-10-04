// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

async function verifyAdminAuth() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    console.log('🔍 Admin Auth - Session cookie exists:', !!sessionCookie);

    if (!sessionCookie) {
      console.log('❌ Admin Auth - No session cookie found');
      return null;
    }

    // Verify session cookie using Firebase Admin
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    console.log('🔍 Admin Auth - Decoded user:', { uid: decoded.uid, email: decoded.email });

    // Get user data from Firestore to check role
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      console.log('❌ Admin Auth - User document not found');
      return null;
    }

    const userData = userDoc.data();
    console.log('🔍 Admin Auth - User role:', userData?.role);
    
    if (userData?.role !== 'admin') {
      console.log('❌ Admin Auth - User is not admin, role:', userData?.role);
      return null;
    }

    if (userData?.isActive === false) {
      console.log('❌ Admin Auth - User account is inactive');
      return null;
    }

    console.log('✅ Admin Auth - Verification successful');
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role,
      ...userData
    };
  } catch (error) {
    console.error('❌ Admin Auth verification error:', error);
    return null;
  }
}

// GET /api/users - Fetch all users (admin only)
export async function GET() {
  try {
    console.log('🔍 API Debug - GET /api/users called');

    const user = await verifyAdminAuth();
    if (!user) {
      console.log('❌ API Debug - Admin auth failed, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users from Firebase Auth
    const listUsersResult = await adminAuth.listUsers();
    
    // Get additional user data from Firestore
    const usersWithData = await Promise.all(
      listUsersResult.users.map(async (authUser) => {
        try {
          // Try to get additional data from Firestore
          const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
          const userData = userDoc.exists ? userDoc.data() : {};

          return {
            id: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName || userData?.displayName || '',
            role: userData?.role || 'customer', // Default to customer if no role specified
            isActive: !authUser.disabled,
            createdAt: authUser.metadata.creationTime || new Date().toISOString(),
            lastSignIn: authUser.metadata.lastSignInTime || null,
            emailVerified: authUser.emailVerified,
            ...userData
          };
        } catch (error) {
          console.error(`Error fetching user data for ${authUser.uid}:`, error);
          return {
            id: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName || '',
            role: 'customer',
            isActive: !authUser.disabled,
            createdAt: authUser.metadata.creationTime || new Date().toISOString(),
            lastSignIn: authUser.metadata.lastSignInTime || null,
            emailVerified: authUser.emailVerified
          };
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      data: usersWithData,
      total: usersWithData.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password, displayName, role } = await request.json();

    // Validate input
    if (!email || !password || !displayName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Only allow admin and seller roles to be created from admin panel
    if (!['admin', 'seller'].includes(role)) {
      return NextResponse.json(
        { error: 'Only admin and seller accounts can be created from this form' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });

    // Set custom claims for role-based access
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      permissions: role === 'admin' ? ['manage_users', 'manage_products', 'manage_orders', 'view_analytics', 'system_settings'] : []
    });

    // Save additional user data to Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      role,
      createdAt: new Date(),
      createdBy: user.uid,
      isActive: true,
      permissions: role === 'admin' ? ['manage_users', 'manage_products', 'manage_orders', 'view_analytics', 'system_settings'] : []
    });

    return NextResponse.json({
      success: true,
      data: {
        id: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('Error creating user:', error);
    
    // Handle specific Firebase Auth errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'Email address is already in use' },
          { status: 400 }
        );
      }
      
      if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }
      
      if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Password is too weak' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
