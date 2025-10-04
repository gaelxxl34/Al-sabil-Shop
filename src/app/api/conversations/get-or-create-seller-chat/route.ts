// src/app/api/conversations/get-or-create-seller-chat/route.ts
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

/**
 * POST /api/conversations/get-or-create-seller-chat
 * For customers: Get or create conversation with their seller
 * Automatically creates conversation on first message
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.uid;
    const userRole = authResult.user.role;

    // Only customers can use this endpoint
    if (userRole !== 'customer') {
      return NextResponse.json(
        { error: 'This endpoint is only for customers' },
        { status: 403 }
      );
    }

    // Get the customer document to find their seller
    const customerDoc = await adminDb.collection('customers').doc(userId).get();
    
    if (!customerDoc.exists) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data();
    const sellerId = customerData?.sellerId;

    if (!sellerId) {
      return NextResponse.json(
        { error: 'No seller assigned to this customer' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existingConversations = await adminDb
      .collection('conversations')
      .where('participants', 'array-contains', userId)
      .where('type', '==', 'general')
      .where('status', '==', 'active')
      .get();

    // Find conversation with this specific seller
    let existingConversation = null;
    for (const doc of existingConversations.docs) {
      const data = doc.data();
      if (data.participants.includes(sellerId)) {
        existingConversation = { id: doc.id, ...data };
        break;
      }
    }

    // If conversation exists, return it
    if (existingConversation) {
      return NextResponse.json({
        success: true,
        conversationId: existingConversation.id,
        conversation: existingConversation,
        created: false
      });
    }

    // Create new conversation
    const body = await request.json().catch(() => ({}));
    const { initialMessage } = body;

    // Fetch participant names
    const userData = authResult.user;
    const customerName = (userData as any).displayName || userData.email || 'Customer';
    const sellerDoc = await adminDb.collection('users').doc(sellerId).get();
    const sellerData = sellerDoc.data();
    const sellerName = sellerData?.displayName || sellerData?.email || 'Seller';

    const participantNames: { [key: string]: string } = {
      [userId]: customerName,
      [sellerId]: sellerName
    };

    const now = Date.now();

    const conversationData: Record<string, any> = {
      participants: [userId, sellerId],
      participantRoles: {
        [userId]: 'customer',
        [sellerId]: 'seller'
      },
      participantNames,
      type: 'general',
      subject: `Chat: ${customerName}`,
      lastMessage: {
        text: initialMessage || 'Conversation started',
        senderId: userId,
        timestamp: now
      },
      unreadCount: {
        [userId]: 0,
        [sellerId]: initialMessage ? 1 : 0
      },
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    const conversationRef = await adminDb.collection('conversations').add(conversationData);
    const conversationId = conversationRef.id;

    // Create initial message if provided
    if (initialMessage) {
      await adminDb
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          conversationId,
          senderId: userId,
          senderName: customerName,
          senderRole: 'customer',
          text: initialMessage,
          type: 'text',
          isRead: false,
          readBy: [userId],
          timestamp: now,
          createdAt: now
        });

      // Create notification for seller
      await adminDb.collection('notifications').add({
        userId: sellerId,
        type: 'new-message',
        title: `New message from ${customerName}`,
        body: initialMessage.substring(0, 100),
        data: {
          conversationId
        },
        isRead: false,
        isPushed: false,
        createdAt: now
      });
    }

    return NextResponse.json({
      success: true,
      conversationId,
      conversation: { id: conversationId, ...conversationData },
      created: true
    });
  } catch (error: unknown) {
    console.error('Error getting/creating conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to get or create conversation', details: errorMessage },
      { status: 500 }
    );
  }
}
