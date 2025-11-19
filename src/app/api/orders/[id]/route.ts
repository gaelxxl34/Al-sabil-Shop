import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { emitOrderEvent } from '@/lib/order-events';
import { Order, PaymentRecord } from '@/types/cart';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

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

    // Get the order
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;

    // Check access permissions
    if (userRole === 'customer' && order.customerId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (userRole === 'seller' && order.sellerId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: order,
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

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
      status, 
      paymentStatus, 
      deliveryDate, 
      notes, 
      items, 
      subtotal, 
      deliveryFee, 
      total,
      // New payment-related fields
      paymentAmount,
      paymentMethod,
      paymentNotes,
      // Credit note fields
      creditNoteAmount,
      creditNoteReason,
      creditNoteNotes
    } = body;

    // Get the existing order
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const existingOrder = orderDoc.data() as Order;

    // Check permissions - only sellers and admins can update orders
    if (userRole === 'customer') {
      return NextResponse.json({ error: 'Customers cannot update orders' }, { status: 403 });
    }
    
    if (userRole === 'seller' && existingOrder.sellerId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: Partial<Order> = {
      updatedAt: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (deliveryDate) updateData.deliveryDate = deliveryDate;
    if (notes) updateData.notes = notes;
    if (items) updateData.items = items;
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (deliveryFee !== undefined) updateData.deliveryFee = deliveryFee;
    if (total !== undefined) updateData.total = total;

    // Handle payment recording
    if (paymentAmount && paymentAmount > 0) {
      const currentTotalPaid = existingOrder.totalPaid || 0;
      const orderTotal = existingOrder.total;
      const newTotalPaid = currentTotalPaid + paymentAmount;

      // Validate payment amount
      if (newTotalPaid > orderTotal) {
        return NextResponse.json({ 
          error: `Payment amount (€${paymentAmount}) would exceed remaining balance of €${(orderTotal - currentTotalPaid).toFixed(2)}` 
        }, { status: 400 });
      }

      // Create new payment record
      const newPayment: PaymentRecord = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: paymentAmount,
        date: new Date().toISOString(),
        method: paymentMethod || 'cash',
        notes: paymentNotes || '',
        createdBy: decodedToken.uid,
        createdAt: new Date().toISOString(),
      };

      // Update payment tracking
      const currentPayments = existingOrder.payments || [];
      updateData.payments = [...currentPayments, newPayment];
      updateData.totalPaid = newTotalPaid;
      updateData.remainingAmount = orderTotal - newTotalPaid;

      // Auto-update payment status based on amount paid
      if (newTotalPaid >= orderTotal) {
        updateData.paymentStatus = 'paid';
      } else if (newTotalPaid > 0) {
        updateData.paymentStatus = 'partial';
      }
    }

    // Handle credit note issuance
    if (creditNoteAmount && creditNoteAmount > 0) {
      const currentTotal = existingOrder.total;
      const originalTotal = existingOrder.originalTotal || currentTotal;
      const currentTotalCreditNotes = existingOrder.totalCreditNotes || 0;
      const currentTotalPaid = existingOrder.totalPaid || 0;

      // Validate credit note amount
      if (creditNoteAmount > currentTotal) {
        return NextResponse.json({ 
          error: `Credit note amount (€${creditNoteAmount}) cannot exceed current order total of €${currentTotal.toFixed(2)}` 
        }, { status: 400 });
      }

      // Create new credit note record
      const newCreditNote = {
        id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: creditNoteAmount,
        reason: creditNoteReason || 'other',
        notes: creditNoteNotes || '',
        date: new Date().toISOString(),
        createdBy: decodedToken.uid,
        createdAt: new Date().toISOString(),
      };

      // Update credit note tracking
      const currentCreditNotes = existingOrder.creditNotes || [];
      updateData.creditNotes = [...currentCreditNotes, newCreditNote];
      updateData.totalCreditNotes = currentTotalCreditNotes + creditNoteAmount;
      updateData.originalTotal = originalTotal;

      // Reduce the total by credit note amount
      const newTotal = currentTotal - creditNoteAmount;
      updateData.total = newTotal;

      // Recalculate remaining amount
      const newRemainingAmount = Math.max(0, newTotal - currentTotalPaid);
      updateData.remainingAmount = newRemainingAmount;

      // Update payment status if fully paid after credit
      if (newRemainingAmount === 0 && currentTotalPaid > 0) {
        updateData.paymentStatus = 'paid';
      } else if (currentTotalPaid > 0 && newRemainingAmount > 0) {
        updateData.paymentStatus = 'partial';
      }
    }

    // Update the order
    await adminDb.collection('orders').doc(orderId).update(updateData);

    // Get the updated order
    const updatedOrderDoc = await adminDb.collection('orders').doc(orderId).get();
    const updatedOrder = { id: updatedOrderDoc.id, ...updatedOrderDoc.data() } as Order;

    emitOrderEvent({
      type: 'order.updated',
      order: updatedOrder,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: creditNoteAmount 
        ? `Credit note of €${creditNoteAmount.toFixed(2)} issued successfully. Order total reduced from €${existingOrder.total.toFixed(2)} to €${updatedOrder.total.toFixed(2)}` 
        : paymentAmount 
          ? `Payment of €${paymentAmount.toFixed(2)} recorded successfully` 
          : 'Order updated successfully',
    });

  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

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

    // Get the order to check permissions
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data() as Order;

    // Only admins and sellers can delete orders
    if (userRole === 'customer') {
      return NextResponse.json({ error: 'Customers cannot delete orders' }, { status: 403 });
    }
    
    if (userRole === 'seller' && order.sellerId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Sellers and admins can delete any order at any status
    // Delete the order
    await adminDb.collection('orders').doc(orderId).delete();

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
