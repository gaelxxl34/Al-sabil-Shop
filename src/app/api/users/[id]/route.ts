// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

async function verifyAdminAuth() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    // Verify session cookie using Firebase Admin
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    // Get user data from Firestore to check role
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    
    if (userData?.role !== 'admin' || userData?.isActive === false) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role,
      ...userData
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

// GET /api/users/[id] - Get single user
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdminAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Get user from Firebase Auth
    const authUser = await adminAuth.getUser(userId);
    
    // Get additional data from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const userWithData = {
      id: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || userData?.displayName || '',
      role: userData?.role || 'customer',
      isActive: !authUser.disabled,
      createdAt: authUser.metadata.creationTime,
      lastSignIn: authUser.metadata.lastSignInTime,
      emailVerified: authUser.emailVerified,
      ...userData
    };

    return NextResponse.json({ 
      success: true, 
      data: userWithData
    });

  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdminAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    const { displayName, role, isActive } = await request.json();

    // Validate inputs
    if (displayName !== undefined && !displayName.trim()) {
      return NextResponse.json(
        { error: 'Display name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate role (only admin and seller can be managed from admin panel)
    if (role && !['admin', 'seller'].includes(role)) {
      return NextResponse.json(
        { error: 'Only admin and seller accounts can be managed from this panel' },
        { status: 400 }
      );
    }

    // Prevent changing your own role or deactivating your own account
    if (userId === user.uid) {
      if (role && role !== 'admin') {
        return NextResponse.json(
          { error: 'Cannot change your own role' },
          { status: 400 }
        );
      }
      if (isActive === false) {
        return NextResponse.json(
          { error: 'Cannot deactivate your own account' },
          { status: 400 }
        );
      }
    }

    // Get current user data
    const currentUserDoc = await adminDb.collection('users').doc(userId).get();
    if (!currentUserDoc.exists) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const currentUserData = currentUserDoc.data();

    // Update Firebase Auth user
    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (isActive !== undefined) updateData.disabled = !isActive;

    if (Object.keys(updateData).length > 0) {
      await adminAuth.updateUser(userId, updateData);
    }

    // Update Firestore data
    const firestoreData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.uid
    };
    if (displayName !== undefined) firestoreData.displayName = displayName.trim();
    if (role !== undefined) firestoreData.role = role;
    if (isActive !== undefined) firestoreData.isActive = isActive;

    await adminDb.collection('users').doc(userId).update(firestoreData);

    // If role is changing, we might need to clean up data
    if (role && currentUserData?.role !== role) {
      console.log(`Role change detected: ${currentUserData?.role} -> ${role} for user ${userId}`);
      
      // If changing from seller to admin, we should handle their existing data
      if (currentUserData?.role === 'seller' && role === 'admin') {
        // Could add logic here to transfer or archive seller data
        console.log(`Converting seller ${userId} to admin - existing seller data preserved`);
      }
      
      // If changing from admin to seller, clean up admin-specific data if needed
      if (currentUserData?.role === 'admin' && role === 'seller') {
        console.log(`Converting admin ${userId} to seller`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: userId,
        displayName: displayName || currentUserData?.displayName,
        role: role || currentUserData?.role,
        isActive: isActive !== undefined ? isActive : currentUserData?.isActive
      }
    });

  } catch (error: unknown) {
    console.error('Error updating user:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdminAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Prevent self-deletion
    if (userId === user.uid) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get user data to check role
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const normalizedRole = typeof userData?.role === 'string'
      ? userData.role.toLowerCase()
      : undefined;
    const allowedRoles: Array<'admin' | 'seller' | 'customer'> = ['admin', 'seller', 'customer'];

    if (normalizedRole && !allowedRoles.includes(normalizedRole as 'admin' | 'seller' | 'customer')) {
      return NextResponse.json(
        { error: 'This user type cannot be deleted from the admin panel.' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Starting deletion process for user ${userId} with role: ${userData?.role}`);

    // Begin cleanup process - we'll do this in stages to avoid batch limits
    const deletedCollections: string[] = [];

    try {
      // Stage 1: Delete main user document
      await adminDb.collection('users').doc(userId).delete();
      deletedCollections.push('users');
      console.log(`✅ Deleted user document for ${userId}`);

      // Stage 2: If this is a seller, clean up related data
      if (normalizedRole === 'seller') {
        // Delete customers belonging to this seller
        try {
          const customersSnapshot = await adminDb
            .collection('customers')
            .where('sellerId', '==', userId)
            .get();

          if (!customersSnapshot.empty) {
            const customerBatch = adminDb.batch();
            customersSnapshot.docs.forEach(doc => {
              customerBatch.delete(doc.ref);
            });
            await customerBatch.commit();
            deletedCollections.push(`customers (${customersSnapshot.size} docs)`);
            console.log(`✅ Deleted ${customersSnapshot.size} customer documents`);
          }
        } catch (error) {
          console.warn(`⚠️ Error deleting customers for seller ${userId}:`, error);
        }

        // Delete products belonging to this seller
        try {
          const productsSnapshot = await adminDb
            .collection('products')
            .where('sellerId', '==', userId)
            .get();

          if (!productsSnapshot.empty) {
            const productBatch = adminDb.batch();
            productsSnapshot.docs.forEach(doc => {
              productBatch.delete(doc.ref);
            });
            await productBatch.commit();
            deletedCollections.push(`products (${productsSnapshot.size} docs)`);
            console.log(`✅ Deleted ${productsSnapshot.size} product documents`);
          }
        } catch (error) {
          console.warn(`⚠️ Error deleting products for seller ${userId}:`, error);
        }

        // Delete orders involving this seller
        try {
          const ordersSnapshot = await adminDb
            .collection('orders')
            .where('sellerId', '==', userId)
            .get();

          if (!ordersSnapshot.empty) {
            const orderBatch = adminDb.batch();
            ordersSnapshot.docs.forEach(doc => {
              orderBatch.delete(doc.ref);
            });
            await orderBatch.commit();
            deletedCollections.push(`orders (${ordersSnapshot.size} docs)`);
            console.log(`✅ Deleted ${ordersSnapshot.size} order documents`);
          }
        } catch (error) {
          console.warn(`⚠️ Error deleting orders for seller ${userId}:`, error);
        }
      }

      // Stage 3: If this is a customer, clean up their data
      if (normalizedRole === 'customer') {
        // Delete customer profile if exists
        try {
          const customerDoc = await adminDb.collection('customers').doc(userId).get();
          if (customerDoc.exists) {
            await customerDoc.ref.delete();
            deletedCollections.push('customer profile');
            console.log(`✅ Deleted customer profile for ${userId}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error deleting customer profile for ${userId}:`, error);
        }

        // Delete orders by this customer
        try {
          const customerOrdersSnapshot = await adminDb
            .collection('orders')
            .where('customerId', '==', userId)
            .get();

          if (!customerOrdersSnapshot.empty) {
            const orderBatch = adminDb.batch();
            customerOrdersSnapshot.docs.forEach(doc => {
              orderBatch.delete(doc.ref);
            });
            await orderBatch.commit();
            deletedCollections.push(`customer orders (${customerOrdersSnapshot.size} docs)`);
            console.log(`✅ Deleted ${customerOrdersSnapshot.size} customer order documents`);
          }
        } catch (error) {
          console.warn(`⚠️ Error deleting customer orders for ${userId}:`, error);
        }
      }

      // Stage 4: Clean up creator/updater references
      try {
        const createdByBatch = adminDb.batch();
        const usersSnapshot = await adminDb
          .collection('users')
          .where('createdBy', '==', userId)
          .get();

        usersSnapshot.docs.forEach(doc => {
          createdByBatch.update(doc.ref, { createdBy: null });
        });

        if (!usersSnapshot.empty) {
          await createdByBatch.commit();
          console.log(`✅ Cleaned up createdBy references (${usersSnapshot.size} docs)`);
        }
      } catch (error) {
        console.warn(`⚠️ Error cleaning up createdBy references:`, error);
      }

      try {
        const updatedByBatch = adminDb.batch();
        const updatedUsersSnapshot = await adminDb
          .collection('users')
          .where('updatedBy', '==', userId)
          .get();

        updatedUsersSnapshot.docs.forEach(doc => {
          updatedByBatch.update(doc.ref, { updatedBy: null });
        });

        if (!updatedUsersSnapshot.empty) {
          await updatedByBatch.commit();
          console.log(`✅ Cleaned up updatedBy references (${updatedUsersSnapshot.size} docs)`);
        }
      } catch (error) {
        console.warn(`⚠️ Error cleaning up updatedBy references:`, error);
      }

      // Stage 5: Finally, delete from Firebase Auth
      await adminAuth.deleteUser(userId);
      console.log(`✅ Deleted Firebase Auth user ${userId}`);

      console.log(`🎉 Successfully deleted user ${userId} and cleaned up: ${deletedCollections.join(', ')}`);

      return NextResponse.json({
        success: true,
        message: 'User and all associated data deleted successfully',
        deletedCollections: deletedCollections
      });

    } catch (cleanupError) {
      console.error(`❌ Error during cleanup for user ${userId}:`, cleanupError);
      
      // If we get here, some cleanup may have partially succeeded
      // We should still try to delete the Firebase Auth user if Firestore cleanup worked
      try {
        await adminAuth.deleteUser(userId);
        console.log(`✅ Deleted Firebase Auth user ${userId} despite cleanup errors`);
      } catch (authError) {
        console.error(`❌ Failed to delete Firebase Auth user ${userId}:`, authError);
      }

      return NextResponse.json({
        success: false,
        error: 'User deletion completed but some cleanup operations failed',
        partialSuccess: deletedCollections.length > 0,
        deletedCollections: deletedCollections
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('❌ Error deleting user:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
