// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { emitOrderEvent } from '@/lib/order-events';
import { Order, OrderItem } from '@/types/cart';
import { Query, DocumentData } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const sellerId = searchParams.get('sellerId');

    // Verify authentication using session cookie
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get user data from Firestore to check role and permissions
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const userRole = userData?.role || 'customer';

    let ordersQuery: Query<DocumentData> = adminDb.collection('orders');
    let postFilterCustomerId: string | null = null;

    if (userRole === 'seller') {
      const resolvedSellerId = sellerId ?? decodedToken.uid;
      if (resolvedSellerId !== decodedToken.uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      ordersQuery = ordersQuery.where('sellerId', '==', resolvedSellerId);
      if (customerId) {
        postFilterCustomerId = customerId;
      }
    } else if (userRole === 'customer') {
      const resolvedCustomerId = customerId ?? decodedToken.uid;
      if (resolvedCustomerId !== decodedToken.uid) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      ordersQuery = ordersQuery.where('customerId', '==', resolvedCustomerId);
    } else if (userRole === 'admin') {
      if (sellerId) {
        ordersQuery = ordersQuery.where('sellerId', '==', sellerId);
      } else if (customerId) {
        ordersQuery = ordersQuery.where('customerId', '==', customerId);
      }
    } else {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Order by creation date (newest first)
    ordersQuery = ordersQuery.orderBy('createdAt', 'desc');

    const ordersSnapshot = await ordersQuery.get();
    const orders: Order[] = [];

    ordersSnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      } as Order);
    });

    const filteredOrders = postFilterCustomerId
      ? orders.filter((order) => order.customerId === postFilterCustomerId)
      : orders;

    return NextResponse.json({
      success: true,
      data: filteredOrders,
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using session cookie
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get user data from Firestore to check role and permissions
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const userRole = userData?.role || 'customer';

    const body = await request.json();
    const {
      customerId,
      sellerId,
      items,
      deliveryAddress,
      deliveryDate,
      paymentMethod,
      notes,
      subtotal,
      deliveryFee,
    } = body;

    // Validate required fields
    if (!customerId || !sellerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, sellerId, items' },
        { status: 400 }
      );
    }

    // Validate subtotal is provided
    if (subtotal === undefined || subtotal === null || typeof subtotal !== 'number') {
      return NextResponse.json(
        { error: 'Subtotal is required and must be a number' },
        { status: 400 }
      );
    }

    // Verify the user can create this order
    if (decodedToken.uid !== customerId && userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify customer belongs to seller
    const customerDoc = await adminDb.collection('users').doc(customerId).get();
    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerDoc.data();
    if (customerData?.sellerId !== sellerId) {
      return NextResponse.json({ error: 'Customer does not belong to this seller' }, { status: 403 });
    }

    // Calculate delivery fee if not provided
    const finalDeliveryFee = deliveryFee !== undefined ? deliveryFee : (subtotal >= 100 ? 0 : 5);
    
    // Calculate total
    const total = subtotal + finalDeliveryFee;

    // Convert cart items to order items
    const orderItems: OrderItem[] = items.map((item: {
      id: string;
      productId: string;
      name: string;
      unit: string;
      quantity: number;
      price: number;
    }) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
    }));

    // Create order document
    const now = new Date().toISOString();
    const baseOrder = {
      customerId,
      sellerId,
      items: orderItems,
      status: 'pending' as const,
      paymentStatus: 'pending' as const,
      paymentMethod: paymentMethod || 'credit',
      subtotal,
      deliveryFee: finalDeliveryFee,
      total,
      totalPaid: 0, // Initialize with 0 paid amount
      remainingAmount: total, // Initially, full amount is remaining
      payments: [], // Initialize with empty payments array
      deliveryAddress: deliveryAddress || '',
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    // Only add deliveryDate if it's provided and not undefined
    const order: Omit<Order, 'id'> = deliveryDate 
      ? { ...baseOrder, deliveryDate }
      : baseOrder;

    // Save to Firestore
    const orderRef = await adminDb.collection('orders').add(order);

    const createdOrder: Order = {
      id: orderRef.id,
      ...order,
    };

    // Note: Future feature for notifications can fetch seller data here

    emitOrderEvent({
      type: 'order.created',
      order: createdOrder,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: createdOrder,
      message: 'Order created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
