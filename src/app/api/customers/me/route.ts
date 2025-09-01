// src/app/api/customers/me/route.ts
// Endpoint for customers to get their own profile data

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

async function verifyCustomerAuth() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      console.log('❌ Customer Auth - No session cookie found');
      return null;
    }

    // Verify session cookie using Firebase Admin
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    console.log('🔍 Customer Auth - Decoded user:', { uid: decoded.uid, email: decoded.email });

    // Get user data from Firestore to check role
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      console.log('❌ Customer Auth - User document not found');
      return null;
    }

    const userData = userDoc.data();
    console.log('🔍 Customer Auth - User role:', userData?.role);
    
    if (userData?.role !== 'customer') {
      console.log('❌ Customer Auth - User is not a customer');
      return null;
    }

    if (userData?.isActive === false) {
      console.log('❌ Customer Auth - User account is inactive');
      return null;
    }

    console.log('✅ Customer Auth - Verification successful');
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role,
      sellerId: userData.sellerId,
      ...userData
    };
  } catch (error) {
    console.error('❌ Customer Auth verification error:', error);
    return null;
  }
}

// GET /api/customers/me - Get current customer's profile data and products
export async function GET() {
  try {
    const customer = await verifyCustomerAuth();
    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized. Only customers can access this endpoint.' }, { status: 401 });
    }

    // Get customer data from the customers collection
    const customerDoc = await adminDb.collection('customers').doc(customer.uid).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const customerData = customerDoc.data();

    // Get only the products that are assigned to this customer (exist in their prices object)
    const customerPrices = customerData?.prices || {};
    const assignedProductIds = Object.keys(customerPrices);
    
    // If no products are assigned to this customer, return empty array
    if (assignedProductIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          customer: {
            id: customerDoc.id,
            ...customerData,
            createdAt: customerData?.createdAt?.toDate?.()?.toISOString() || customerData?.createdAt
          },
          products: []
        }
      });
    }

    // Get only the products that are assigned to this customer
    const productsQuery = adminDb.collection('products')
      .where('sellerId', '==', customer.sellerId)
      .where('isActive', '==', true);

    const productsSnapshot = await productsQuery.get();
    const products: Array<{
      id: string;
      name: string;
      unit: string;
      description: string;
      category: string;
      sellerId: string;
      imageBase64: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }> = [];

    productsSnapshot.forEach((doc) => {
      const productId = doc.id;
      
      // Only include products that exist in the customer's prices object
      if (assignedProductIds.includes(productId)) {
        const data = doc.data();
        products.push({
          id: doc.id,
          name: data.name || '',
          unit: data.unit || '',
          description: data.description || '',
          category: data.category || '',
          sellerId: data.sellerId || '',
          imageBase64: data.imageBase64 || '',
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      }
    });

    // Sort products by creation date (newest first)
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customerDoc.id,
          ...customerData,
          createdAt: customerData?.createdAt?.toDate?.()?.toISOString() || customerData?.createdAt
        },
        products: products
      }
    });

  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer profile' },
      { status: 500 }
    );
  }
}
