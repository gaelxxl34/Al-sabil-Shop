import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id: transactionId } = await params;

    // Verify authentication
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    let userRole = decodedToken.role;
    const userId = decodedToken.uid;

    // Fallback: If role is not in token claims, fetch from Firestore
    if (!userRole) {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData?.role;
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Only sellers and admins can delete transactions
    if (userRole !== 'seller' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get transaction to verify ownership
    const transactionDoc = await adminDb.collection('transactions').doc(transactionId).get();
    
    if (!transactionDoc.exists) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const transactionData = transactionDoc.data();

    // Verify seller owns this transaction (unless admin)
    if (userRole === 'seller' && transactionData?.sellerId !== userId) {
      return NextResponse.json({ error: 'Forbidden - You can only delete your own transactions' }, { status: 403 });
    }

    // Delete the transaction
    await adminDb.collection('transactions').doc(transactionId).delete();

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
