import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

interface VerifiedAdmin {
  uid: string;
  email?: string;
  role: string;
}

async function verifyAdminAuth(): Promise<VerifiedAdmin | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
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
    };
  } catch (error) {
    console.error('Admin auth verification failed:', error);
    return null;
  }
}

function getDocTimestamp(value: unknown): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    return new Date().toISOString();
  }

  // Firestore Timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timestampValue = value as any;
  if (timestampValue?.toDate) {
    try {
      return timestampValue.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  return new Date().toISOString();
}

export async function GET() {
  try {
    const adminUser = await verifyAdminAuth();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [sellersSnapshot, customersSnapshot, productsSnapshot, ordersSnapshot] = await Promise.all([
      adminDb.collection('users').where('role', '==', 'seller').get(),
      adminDb.collection('users').where('role', '==', 'customer').get(),
      adminDb.collection('products').get(),
      adminDb.collection('orders').get(),
    ]);

    const sellerMap: Record<string, { id: string; name: string }> = {};
    sellersSnapshot.forEach((doc) => {
      const data = doc.data();
      sellerMap[doc.id] = {
        id: doc.id,
        name: data.displayName || data.email || doc.id,
      };
    });

    const customersBySeller: Record<string, number> = {};
    customersSnapshot.forEach((doc) => {
      const data = doc.data();
      const sellerId = data.sellerId as string | undefined;
      if (sellerId) {
        customersBySeller[sellerId] = (customersBySeller[sellerId] || 0) + 1;
      }
    });

    const totalOutstanding = ordersSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      const remaining = typeof data.remainingAmount === 'number' ? data.remainingAmount : 0;
      return sum + remaining;
    }, 0);

    const totalPaid = ordersSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      const paid = typeof data.totalPaid === 'number' ? data.totalPaid : 0;
      return sum + paid;
    }, 0);

    const recentSellersQuery = await adminDb
      .collection('users')
      .where('role', '==', 'seller')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentOrdersQuery = await adminDb
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentSellers = recentSellersQuery.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.displayName || data.email || 'Unknown Seller',
        email: data.email || '',
        createdAt: getDocTimestamp(data.createdAt),
        isActive: data.isActive !== false,
      };
    });

    const recentOrders = recentOrdersQuery.docs.map((doc) => {
      const data = doc.data();
      const sellerId = data.sellerId as string | undefined;
      const customerId = data.customerId as string | undefined;
      return {
        id: doc.id,
        total: typeof data.total === 'number' ? data.total : 0,
        status: data.status || 'pending',
        paymentStatus: data.paymentStatus || 'pending',
        createdAt: getDocTimestamp(data.createdAt),
        sellerId,
        sellerName: sellerId ? sellerMap[sellerId]?.name || sellerId : 'Unknown Seller',
        customerId,
      };
    });

    const sellerCustomerBreakdown = Object.entries(customersBySeller).map(([sellerId, count]) => ({
      sellerId,
      sellerName: sellerMap[sellerId]?.name || sellerId,
      customerCount: count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          sellers: sellersSnapshot.size,
          customers: customersSnapshot.size,
          products: productsSnapshot.size,
          orders: ordersSnapshot.size,
          totalPaid,
          totalOutstanding,
        },
        recentSellers,
        recentOrders,
        sellerCustomerBreakdown,
      },
    });
  } catch (error) {
    console.error('Failed to load admin stats:', error);
    return NextResponse.json({ error: 'Failed to load admin stats' }, { status: 500 });
  }
}