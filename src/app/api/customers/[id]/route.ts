// src/app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { UpdateCustomerData } from '@/types/customer';

async function verifyAuth() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      console.log('❌ Auth - No session cookie found');
      return null;
    }

    // Verify session cookie using Firebase Admin
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    console.log('🔍 Auth - Decoded user:', { uid: decoded.uid, email: decoded.email });

    // Get user data from Firestore to check role
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      console.log('❌ Auth - User document not found');
      return null;
    }

    const userData = userDoc.data();
    console.log('🔍 Auth - User role:', userData?.role);
    
    if (userData?.isActive === false) {
      console.log('❌ Auth - User account is inactive');
      return null;
    }

    console.log('✅ Auth - Verification successful');
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userData?.role,
      ...userData
    };
  } catch (error) {
    console.error('❌ Auth verification error:', error);
    return null;
  }
}

// GET /api/customers/[id] - Get individual customer details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId } = await params;

    // Get customer data from Firestore
    const customerDoc = await adminDb.collection('customers').doc(customerId).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerDoc.data();
    
    // Authorization check:
    // - Sellers can access customers that belong to them
    // - Customers can access their own data
    if (user.role === 'seller') {
      if (customerData?.sellerId !== user.uid) {
        return NextResponse.json({ error: 'Access denied. This customer does not belong to you.' }, { status: 403 });
      }
    } else if (user.role === 'customer') {
      if (user.uid !== customerId) {
        return NextResponse.json({ error: 'Access denied. You can only access your own data.' }, { status: 403 });
      }
    } else if (user.role === 'admin') {
      // Admins can view any customer for oversight and support purposes
    } else {
      return NextResponse.json({ error: 'Access denied. Invalid user role.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: customerDoc.id,
        ...customerData,
        createdAt: customerData?.createdAt?.toDate?.()?.toISOString() || customerData?.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth();
    if (!user || user.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can update customers.' }, { status: 401 });
    }

    const { id: customerId } = await params;
    const customerData: UpdateCustomerData = await request.json();

    // Validate required fields
    if (!customerData.businessName || !customerData.contactPerson || !customerData.email || !customerData.phone || !customerData.address) {
      return NextResponse.json(
        { error: 'Missing required fields: businessName, contactPerson, email, phone, address' },
        { status: 400 }
      );
    }

    // Get existing customer to verify ownership
    const existingDoc = await adminDb.collection('customers').doc(customerId).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const existingData = existingDoc.data();
    if (existingData?.sellerId !== user.uid) {
      return NextResponse.json({ error: 'Access denied. This customer does not belong to you.' }, { status: 403 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Process products data - convert to price map
    const prices: Record<string, number> = {};
    for (const product of customerData.products) {
      if (product.productId && product.price) {
        prices[product.productId] = parseFloat(product.price);
      }
    }

    // Prepare updated customer document data
    const updatedCustomerDoc = {
      // Basic information
      businessName: customerData.businessName,
      contactPerson: customerData.contactPerson,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      businessType: customerData.businessType || '',
      deliveryCost: customerData.deliveryCost || 0,
      
      // Additional data
      branches: customerData.branches || [],
      prices: prices,
      notes: customerData.notes || '',
      
      // Keep existing metadata, update modified fields
      sellerId: existingData?.sellerId,
      createdAt: existingData?.createdAt,
      createdBy: existingData?.createdBy,
      isActive: existingData?.isActive,
      passwordChanged: existingData?.passwordChanged,
      updatedAt: new Date(),
      updatedBy: user.uid
    };

    // Update customer data in Firestore
    await adminDb.collection('customers').doc(customerId).update(updatedCustomerDoc);

    // Update user data in users collection if email or name changed
    const userDoc = await adminDb.collection('users').doc(customerId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.email !== customerData.email || userData?.displayName !== customerData.contactPerson) {
        await adminDb.collection('users').doc(customerId).update({
          email: customerData.email,
          displayName: customerData.contactPerson,
          updatedAt: new Date(),
          updatedBy: user.uid
        });

        // Update Firebase Auth record if email changed
        if (userData?.email !== customerData.email) {
          try {
            await adminAuth.updateUser(customerId, {
              email: customerData.email,
              displayName: customerData.contactPerson
            });
          } catch (authError) {
            console.error('Failed to update auth record:', authError);
            // Continue even if auth update fails - Firestore is updated
          }
        }
      }
    }

    // Update password if provided
    if (customerData.password) {
      if (customerData.password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      try {
        await adminAuth.updateUser(customerId, {
          password: customerData.password
        });

        // Update password changed status
        await adminDb.collection('customers').doc(customerId).update({
          passwordChanged: true,
          updatedAt: new Date(),
          updatedBy: user.uid
        });
      } catch (authError) {
        console.error('Failed to update password:', authError);
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        id: customerId,
        email: customerData.email,
        businessName: customerData.businessName,
        contactPerson: customerData.contactPerson,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete customer (both Firestore and Auth)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth();
    if (!user || user.role !== 'seller') {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can delete customers.' }, { status: 401 });
    }

    const { id: customerId } = await params;

    // Get existing customer to verify ownership
    const existingDoc = await adminDb.collection('customers').doc(customerId).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const existingData = existingDoc.data();
    if (existingData?.sellerId !== user.uid) {
      return NextResponse.json({ error: 'Access denied. This customer does not belong to you.' }, { status: 403 });
    }

    // Delete from Firebase Auth first
    try {
      await adminAuth.deleteUser(customerId);
      console.log('✅ Deleted user from Firebase Auth:', customerId);
    } catch (authError) {
      console.error('❌ Failed to delete from Auth (continuing with Firestore deletion):', authError);
      // Continue with Firestore deletion even if Auth deletion fails
    }

    // Delete from Firestore customers collection
    await adminDb.collection('customers').doc(customerId).delete();
    console.log('✅ Deleted customer from Firestore:', customerId);

    // Delete from users collection
    try {
      await adminDb.collection('users').doc(customerId).delete();
      console.log('✅ Deleted user from users collection:', customerId);
    } catch (firestoreError) {
      console.error('❌ Failed to delete from users collection:', firestoreError);
      // This is not critical, customer data is already deleted
    }

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error: unknown) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
