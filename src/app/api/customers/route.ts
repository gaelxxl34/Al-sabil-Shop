// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { CreateCustomerData } from '@/types/customer';

async function verifySellerAuth() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      console.log('❌ Seller Auth - No session cookie found');
      return null;
    }

    // Verify session cookie using Firebase Admin
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    console.log('🔍 Seller Auth - Decoded user:', { uid: decoded.uid, email: decoded.email });

    // Get user data from Firestore to check role
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      console.log('❌ Seller Auth - User document not found');
      return null;
    }

    const userData = userDoc.data();
    console.log('🔍 Seller Auth - User role:', userData?.role);
    
    if (userData?.role !== 'seller') {
      console.log('❌ Seller Auth - User is not a seller');
      return null;
    }

    if (userData?.isActive === false) {
      console.log('❌ Seller Auth - User account is inactive');
      return null;
    }

    console.log('✅ Seller Auth - Verification successful');
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role,
      ...userData
    };
  } catch (error) {
    console.error('❌ Seller Auth verification error:', error);
    return null;
  }
}

// POST /api/customers - Create new customer (seller only)
export async function POST(request: NextRequest) {
  try {
    const seller = await verifySellerAuth();
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can create customers.' }, { status: 401 });
    }

    const customerData: CreateCustomerData = await request.json();

    // Validate required fields
    if (!customerData.businessName || !customerData.contactPerson || !customerData.email || !customerData.phone || !customerData.address || !customerData.password) {
      return NextResponse.json(
        { error: 'Missing required fields: businessName, contactPerson, email, phone, address, password' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (!customerData.password || customerData.password.length < 6) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerData.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate branch user emails and passwords if branches exist
    if (customerData.branches && customerData.branches.length > 0) {
      for (const branch of customerData.branches) {
        if (!branch.email || !branch.password) {
          return NextResponse.json(
            { error: 'Email and password are required for all branch users' },
            { status: 400 }
          );
        }
        
        if (branch.password.length < 6) {
          return NextResponse.json(
            { error: 'Branch user passwords must be at least 6 characters long' },
            { status: 400 }
          );
        }
        
        if (!emailRegex.test(branch.email)) {
          return NextResponse.json(
            { error: `Invalid email format for branch user: ${branch.email}` },
            { status: 400 }
          );
        }
      }
    }

    // Generate a temporary password for the customer
    const password = customerData.password;

    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: customerData.email,
        password: password,
        displayName: customerData.contactPerson,
        emailVerified: false
      });
    } catch (authError: unknown) {
      if (authError && typeof authError === 'object' && 'code' in authError && authError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'A user with this email address already exists' },
          { status: 400 }
        );
      }
      throw authError;
    }

    // Process products data - convert to price map
    const prices: Record<string, number> = {};
    for (const product of customerData.products) {
      if (product.productId && product.price) {
        prices[product.productId] = parseFloat(product.price);
      }
    }

    // Prepare customer document data
    const customerDoc = {
      // Basic information
      businessName: customerData.businessName,
      contactPerson: customerData.contactPerson,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      businessType: customerData.businessType || '',
      deliveryCost: customerData.deliveryCost || 0,
      
      // Relationship
      sellerId: seller.uid as string,
      
      // Additional data
      branches: customerData.branches || [],
      prices: prices,
      notes: customerData.notes || '',
      
      // Metadata
      createdAt: new Date(),
      createdBy: seller.uid,
      isActive: true,
      
      // Password info
      passwordChanged: true // Since seller provided custom password
    };

    // Save customer data to Firestore customers collection
    await adminDb.collection('customers').doc(userRecord.uid).set(customerDoc);

    // Save basic user data to users collection
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: customerData.email,
      displayName: customerData.contactPerson,
      role: 'customer',
      sellerId: seller.uid,
      createdAt: new Date(),
      createdBy: seller.uid,
      isActive: true
    });

    // Set custom claims for the user
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'customer',
      sellerId: seller.uid
    });

    // Create branch user accounts if branches exist
    const createdBranchUsers: Array<{ branchName: string; email: string; userId: string }> = [];
    
    if (customerData.branches && customerData.branches.length > 0) {
      for (const branch of customerData.branches) {
        try {
          // Create branch user in Firebase Auth
          const branchUserRecord = await adminAuth.createUser({
            email: branch.email,
            password: branch.password,
            displayName: branch.contactPerson || `${branch.name} Manager`,
            emailVerified: false
          });

          // Save branch user data to users collection
          await adminDb.collection('users').doc(branchUserRecord.uid).set({
            email: branch.email,
            displayName: branch.contactPerson || `${branch.name} Manager`,
            role: 'customer',
            sellerId: seller.uid,
            parentCustomerId: userRecord.uid, // Link to main customer account
            branchName: branch.name,
            branchAddress: branch.address,
            createdAt: new Date(),
            createdBy: seller.uid,
            isActive: true,
            isBranchUser: true
          });

          // Save branch user data to customers collection (with same pricing as parent)
          await adminDb.collection('customers').doc(branchUserRecord.uid).set({
            businessName: `${customerData.businessName} - ${branch.name}`,
            contactPerson: branch.contactPerson || `${branch.name} Manager`,
            email: branch.email,
            phone: branch.phone || customerData.phone,
            address: branch.address,
            businessType: customerData.businessType || '',
            deliveryCost: customerData.deliveryCost || 0,
            sellerId: seller.uid,
            parentCustomerId: userRecord.uid, // Link to main customer account
            branchName: branch.name,
            prices: prices, // Same pricing as parent customer
            notes: `Branch user for ${customerData.businessName}`,
            createdAt: new Date(),
            createdBy: seller.uid,
            isActive: true,
            isBranchUser: true,
            passwordChanged: true
          });

          // Set custom claims for the branch user
          await adminAuth.setCustomUserClaims(branchUserRecord.uid, {
            role: 'customer',
            sellerId: seller.uid,
            parentCustomerId: userRecord.uid,
            isBranchUser: true
          });

          createdBranchUsers.push({
            branchName: branch.name,
            email: branch.email,
            userId: branchUserRecord.uid
          });

        } catch (branchError: unknown) {
          console.error(`Error creating branch user for ${branch.name}:`, branchError);
          
          // If branch user creation fails, still continue but log the error
          if (branchError && typeof branchError === 'object' && 'code' in branchError && branchError.code === 'auth/email-already-exists') {
            console.error(`Branch user email ${branch.email} already exists`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      data: {
        id: userRecord.uid,
        email: userRecord.email,
        businessName: customerData.businessName,
        contactPerson: customerData.contactPerson,
        createdAt: new Date().toISOString(),
        branchUsers: createdBranchUsers
      }
    });

  } catch (error: unknown) {
    console.error('Error creating customer:', error);
    
    // Handle specific Firebase Auth errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/invalid-email') {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        );
      }
      
      if (error.code === 'auth/weak-password') {
        return NextResponse.json(
          { error: 'Generated password is too weak' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

// GET /api/customers - Get all customers for the current seller
export async function GET() {
  try {
    const seller = await verifySellerAuth();
    if (!seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all customers for this seller from the customers collection
    const customersSnapshot = await adminDb
      .collection('customers')
      .where('sellerId', '==', seller.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const customers = customersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
    }));

    return NextResponse.json({
      success: true,
      data: customers,
      total: customers.length
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
