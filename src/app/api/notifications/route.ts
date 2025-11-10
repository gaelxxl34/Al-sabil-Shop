// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function verifyAuth(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) return { authenticated: false, user: null };

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    
    if (!userDoc.exists) return { authenticated: false, user: null };
    
    const userData = userDoc.data();
    if (userData?.isActive === false) return { authenticated: false, user: null };

    return {
      authenticated: true,
      user: { uid: decoded.uid, email: decoded.email, role: userData?.role, ...userData }
    };
  } catch {
    return { authenticated: false, user: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let query = adminDb
      .collection('notifications')
      .where('userId', '==', authResult.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (unreadOnly) {
      query = query.where('isRead', '==', false);
    }

    const snapshot = await query.get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notifications = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, notifications });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAsRead } = body;

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'notificationIds must be an array' }, { status: 400 });
    }

    const batch = adminDb.batch();

    for (const notificationId of notificationIds) {
      const notificationRef = adminDb.collection('notifications').doc(notificationId);
      const notificationDoc = await notificationRef.get();

      if (notificationDoc.exists) {
        const notification = notificationDoc.data();
        // Verify user owns the notification
        if (notification?.userId === authResult.user.uid) {
          batch.update(notificationRef, { isRead: markAsRead === true });
        }
      }
    }

    await batch.commit();

    return NextResponse.json({ success: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications', details: error.message },
      { status: 500 }
    );
  }
}
