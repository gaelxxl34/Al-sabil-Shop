// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { CreateConversationData, Conversation } from '@/types/conversation';

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
    const userId = authResult.user.uid;
    const status = searchParams.get('status') || 'active';
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = adminDb
      .collection('conversations')
      .where('participants', 'array-contains', userId)
      .where('status', '==', status)
      .orderBy('updatedAt', 'desc')
      .limit(limit);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversations = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, conversations });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateConversationData = await request.json();
    const { participantIds, participantRoles, type, orderId, subject, metadata, initialMessage } = body;

    // Validate
    if (!participantIds || participantIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 participants required' },
        { status: 400 }
      );
    }

    if (!subject || !type) {
      return NextResponse.json(
        { error: 'Subject and type are required' },
        { status: 400 }
      );
    }

    // Ensure current user is a participant
    if (!participantIds.includes(authResult.user.uid)) {
      participantIds.push(authResult.user.uid);
    }

    // Fetch participant names
    const participantNames: { [key: string]: string } = {};
    for (const uid of participantIds) {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        participantNames[uid] = userData?.displayName || userData?.email || 'Unknown';
      }
    }

    const now = Date.now();

    // Create conversation
    const conversationData: Omit<Conversation, 'id'> = {
      participants: participantIds,
      participantRoles: participantRoles || {},
      participantNames,
      type,
      orderId,
      subject,
      lastMessage: {
        text: initialMessage || 'Conversation started',
        senderId: authResult.user.uid,
        timestamp: now
      },
      unreadCount: participantIds.reduce((acc, id) => {
        acc[id] = id === authResult.user.uid ? 0 : 1;
        return acc;
      }, {} as { [key: string]: number }),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      metadata
    };

    const conversationRef = await adminDb.collection('conversations').add(conversationData);
    const conversationId = conversationRef.id;

    // Create initial message if provided
    if (initialMessage) {
      const senderData = await adminDb.collection('users').doc(authResult.user.uid).get();
      const senderName = senderData.data()?.displayName || authResult.user.email || 'Unknown';
      const senderRole = senderData.data()?.role || 'customer';

      await adminDb
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .add({
          conversationId,
          senderId: authResult.user.uid,
          senderName,
          senderRole,
          text: initialMessage,
          type: 'text',
          isRead: false,
          readBy: [authResult.user.uid],
          timestamp: now,
          createdAt: now
        });

      // Create notifications for other participants
      for (const participantId of participantIds) {
        if (participantId !== authResult.user.uid) {
          await adminDb.collection('notifications').add({
            userId: participantId,
            type: 'new-message',
            title: `New message from ${senderName}`,
            body: initialMessage.substring(0, 100),
            data: {
              conversationId
            },
            isRead: false,
            isPushed: false,
            createdAt: now
          });
        }
      }
    }

    // Update order with conversationId if order-related
    if (orderId) {
      await adminDb.collection('orders').doc(orderId).update({
        conversationId,
        chatEnabled: true,
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      conversationId,
      conversation: { id: conversationId, ...conversationData }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error.message },
      { status: 500 }
    );
  }
}
