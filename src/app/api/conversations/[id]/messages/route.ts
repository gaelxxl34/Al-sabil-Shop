// src/app/api/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { CreateMessageData } from '@/types/conversation';
import { FirestoreQueryDocumentSnapshot, FirestoreUpdateData } from '@/types/firestore';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const lastTimestamp = searchParams.get('before');

    // Verify user is participant
    const conversationDoc = await adminDb.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversation = conversationDoc.data();
    if (!conversation?.participants.includes(authResult.user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query for messages
    let query = adminDb
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (lastTimestamp) {
      query = query.where('timestamp', '<', parseInt(lastTimestamp));
    }

    const snapshot = await query.get();
    const messages = snapshot.docs.map((doc: FirestoreQueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body: CreateMessageData = await request.json();
    const { text, type = 'text', attachments } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    // Verify conversation exists and user is participant
    const conversationDoc = await adminDb.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversation = conversationDoc.data();
    if (!conversation?.participants.includes(authResult.user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = Date.now();
    const senderData = await adminDb.collection('users').doc(authResult.user.uid).get();
    const senderName = senderData.data()?.displayName || authResult.user.email || 'Unknown';
    const senderRole = senderData.data()?.role || 'customer';

    // Create message
    const messageData = {
      conversationId,
      senderId: authResult.user.uid,
      senderName,
      senderRole,
      text: text.trim(),
      type,
      attachments: attachments || [],
      isRead: false,
      readBy: [authResult.user.uid],
      timestamp: now,
      createdAt: now
    };

    const messageRef = await adminDb
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add(messageData);

    // Update conversation's lastMessage and unreadCount
    const updateData: FirestoreUpdateData = {
      lastMessage: {
        text: text.substring(0, 100),
        senderId: authResult.user.uid,
        timestamp: now
      },
      updatedAt: now
    };

    // Reset sender's unread count, increment others'
    for (const participantId of conversation.participants) {
      if (participantId === authResult.user.uid) {
        updateData[`unreadCount.${participantId}`] = 0;
      } else {
        updateData[`unreadCount.${participantId}`] = (conversation.unreadCount?.[participantId] || 0) + 1;
      }
    }

    await adminDb.collection('conversations').doc(conversationId).update(updateData);

    // Create notifications for other participants
    for (const participantId of conversation.participants) {
      if (participantId !== authResult.user.uid) {
        await adminDb.collection('notifications').add({
          userId: participantId,
          type: 'new-message',
          title: `New message from ${senderName}`,
          body: text.substring(0, 100),
          data: {
            conversationId
          },
          isRead: false,
          isPushed: false,
          createdAt: now
        });
      }
    }

    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
      message: { id: messageRef.id, ...messageData }
    });
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send message', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Mark all messages in conversation as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    // Verify conversation exists and user is participant
    const conversationDoc = await adminDb.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversation = conversationDoc.data();
    if (!conversation?.participants.includes(authResult.user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Reset unread count for current user
    await adminDb.collection('conversations').doc(conversationId).update({
      [`unreadCount.${authResult.user.uid}`]: 0
    });

    return NextResponse.json({ success: true, message: 'Messages marked as read' });
  } catch (error: unknown) {
    console.error('Error marking messages as read:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to mark messages as read', details: errorMessage },
      { status: 500 }
    );
  }
}
