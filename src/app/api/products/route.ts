// src/app/api/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { CreateProductRequest, Product } from '@/types/product';
import { Query } from 'firebase-admin/firestore';

async function verifyAuth(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

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
    
    if (!['seller', 'admin', 'customer'].includes(userData?.role)) {
      console.log('❌ Auth - User is not authorized');
      return null;
    }

    if (userData?.isActive === false) {
      console.log('❌ Auth - User account is inactive');
      return null;
    }

    console.log('✅ Auth - Verification successful');
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userData?.role,
      sellerId: userData?.sellerId,
      ...userData
    };
  } catch (error) {
    console.error('❌ Auth verification error:', error);
    return null;
  }
}

async function verifySellerAuth(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user || !['seller', 'admin'].includes(user.role)) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    let query: Query = adminDb.collection('products');

    // Handle different user roles
    if (user.role === 'customer') {
      // Customers can only see products from their seller
      if (!user.sellerId) {
        return NextResponse.json({ error: 'Customer is not assigned to a seller' }, { status: 400 });
      }
      query = query.where('sellerId', '==', user.sellerId);
    } else if (user.role === 'seller') {
      // Sellers see their own products or filtered by sellerId
      if (sellerId) {
        query = query.where('sellerId', '==', sellerId);
      } else {
        query = query.where('sellerId', '==', user.uid);
      }
    } else if (user.role === 'admin') {
      // Admins can see all products or filter by sellerId
      if (sellerId) {
        query = query.where('sellerId', '==', sellerId);
      }
    }

    // Only show active products by default
    query = query.where('isActive', '==', true);
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const products: Product[] = [];

    snapshot.forEach((doc) => {
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
        createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
      } as Product);
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifySellerAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can create products.' }, { status: 401 });
    }

    const body: CreateProductRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.unit || !body.category) {
      return NextResponse.json(
        { error: 'Name, unit, and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['beef', 'chicken', 'fish', 'lamb'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    const now = new Date();
    const productData = {
      name: body.name.trim(),
      unit: body.unit.trim(),
      category: body.category,
      description: body.description?.trim() || '',
      imageBase64: body.imageBase64 || '',
      sellerId: user.uid,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection('products').add(productData);

    const newProduct: Product = {
      id: docRef.id,
      name: productData.name,
      unit: productData.unit,
      category: productData.category,
      description: productData.description,
      imageBase64: productData.imageBase64,
      sellerId: productData.sellerId,
      isActive: productData.isActive,
      createdAt: productData.createdAt.toISOString(),
      updatedAt: productData.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: newProduct }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
