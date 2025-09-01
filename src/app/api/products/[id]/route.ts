// src/app/api/products/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { UpdateProductRequest, Product } from '@/types/product';

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
    
    if (!['seller', 'admin'].includes(userData?.role)) {
      console.log('❌ Seller Auth - User is not a seller or admin');
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
      role: userData?.role,
      ...userData
    };
  } catch (error) {
    console.error('❌ Seller Auth verification error:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifySellerAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can access products.' }, { status: 401 });
    }

    const { id } = await params;
    const doc = await adminDb.collection('products').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data = doc.data()!;

    // Check if user has permission to view this product
    if (user.role !== 'admin' && data.sellerId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const product: Product = {
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
    };

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifySellerAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can update products.' }, { status: 401 });
    }

    const { id } = await params;
    const doc = await adminDb.collection('products').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const existingData = doc.data()!;

    // Check if user owns this product (unless admin)
    if (user.role !== 'admin' && existingData.sellerId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body: UpdateProductRequest = await request.json();

    // Validate category if provided
    if (body.category) {
      const validCategories = ['beef', 'chicken', 'fish', 'lamb'];
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        );
      }
    }

    const updateData: Partial<{
      name: string;
      unit: string;
      category: string;
      description: string;
      imageBase64: string;
      isActive: boolean;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.unit !== undefined) updateData.unit = body.unit.trim();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.imageBase64 !== undefined) updateData.imageBase64 = body.imageBase64;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await adminDb.collection('products').doc(id).update(updateData);

    // Fetch updated product
    const updatedDoc = await adminDb.collection('products').doc(id).get();
    const updatedData = updatedDoc.data()!;

    const product: Product = {
      id: updatedDoc.id,
      name: updatedData.name || '',
      unit: updatedData.unit || '',
      description: updatedData.description || '',
      category: updatedData.category || '',
      sellerId: updatedData.sellerId || '',
      imageBase64: updatedData.imageBase64 || '',
      isActive: updatedData.isActive !== false,
      createdAt: updatedData.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedData.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifySellerAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Only sellers can delete products.' }, { status: 401 });
    }

    const { id } = await params;
    const doc = await adminDb.collection('products').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const existingData = doc.data()!;

    // Check if user owns this product (unless admin)
    if (user.role !== 'admin' && existingData.sellerId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete by setting isActive to false
    await adminDb.collection('products').doc(id).update({
      isActive: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
