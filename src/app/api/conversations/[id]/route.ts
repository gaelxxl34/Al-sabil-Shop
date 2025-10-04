// src/app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FirestoreUpdateData, FirestoreQueryDocumentSnapshot } from '@/types/firestore';

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
    const conversationDoc = await adminDb.collection('conversations').doc(conversationId).get();

    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    const conversation = { id: conversationDoc.id, ...conversationData };

    // Check if user is a participant
    if (!conversationData?.participants || !(conversationData.participants as string[]).includes(authResult.user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error: unknown) {
    console.error('Error fetching conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch conversation', details: errorMessage },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { status, unreadCount } = body;

    const conversationDoc = await adminDb.collection('conversations').doc(conversationId).get();

    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversation = conversationDoc.data();

    // Check if user is a participant
    if (!conversation?.participants.includes(authResult.user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: FirestoreUpdateData = {
      updatedAt: Date.now()
    };

    if (status) {
      // Only admins can change status
      if (authResult.user.role === 'admin') {
        updateData.status = status;
      }
    }

    if (unreadCount !== undefined) {
      // User can only update their own unread count
      updateData[`unreadCount.${authResult.user.uid}`] = unreadCount;
    }

    await adminDb.collection('conversations').doc(conversationId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update conversation', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete conversations
    if (authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: conversationId } = await params;

    // Delete all messages
    const messagesSnapshot = await adminDb
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .get();

    const batch = adminDb.batch();
    messagesSnapshot.docs.forEach((doc: FirestoreQueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Delete conversation
    await adminDb.collection('conversations').doc(conversationId).delete();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete conversation', details: errorMessage },
      { status: 500 }
    );
  }
}
