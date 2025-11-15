import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Transaction, CreateTransactionInput } from '@/types/transaction';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      console.log('No session cookie found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    if (!decodedToken) {
      console.log('Invalid session token');
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Debug: Log the entire decoded token to see what claims are available
    console.log('Decoded token:', JSON.stringify(decodedToken, null, 2));
    
    let userRole = decodedToken.role;
    const userId = decodedToken.uid;

    // Fallback: If role is not in token claims, fetch from Firestore
    if (!userRole) {
      console.log('⚠️  Role not found in token claims, fetching from Firestore...');
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData?.role;
        console.log('✅ Role fetched from Firestore:', userRole);
        
        // Update custom claims for future requests
        try {
          await adminAuth.setCustomUserClaims(userId, {
            role: userRole,
            permissions: userData?.permissions || [],
          });
          console.log('✅ Custom claims updated');
        } catch (error) {
          console.error('Error setting custom claims:', error);
        }
      } else {
        console.log('❌ User document not found in Firestore');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    console.log('User role:', userRole, 'User ID:', userId);

    // Only sellers and admins can view transactions
    if (userRole !== 'seller' && userRole !== 'admin') {
      console.log('User role not authorized:', userRole);
      return NextResponse.json({ error: 'Forbidden - Only sellers and admins can view transactions' }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('Filters:', { customerId, paymentMethod, startDate, endDate });

    // Build query - start with base collection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = adminDb.collection('transactions');

    // Filter by seller first (most important filter for sellers)
    if (userRole === 'seller') {
      query = query.where('sellerId', '==', userId);
    }

    // Apply additional filters only if base filter exists
    // Note: Multiple where clauses may require composite indexes in Firestore
    if (customerId && userRole === 'seller') {
      query = query.where('customerId', '==', customerId);
    }

    // Order by transaction date
    query = query.orderBy('transactionDate', 'desc');

    console.log('Executing query...');
    const snapshot = await query.get();
    console.log('Query returned', snapshot.docs.length, 'documents');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let transactions: Transaction[] = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));

    // Apply client-side filtering for fields that don't have indexes
    if (paymentMethod) {
      transactions = transactions.filter(t => t.paymentMethod === paymentMethod);
    }

    if (startDate) {
      transactions = transactions.filter(t => t.transactionDate >= startDate);
    }

    if (endDate) {
      transactions = transactions.filter(t => t.transactionDate <= endDate);
    }

    // If admin and customerId filter is set, apply it client-side
    if (userRole === 'admin' && customerId) {
      transactions = transactions.filter(t => t.customerId === customerId);
    }

    console.log('Returning', transactions.length, 'filtered transactions');

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      console.log('⚠️  Role not found in token claims, fetching from Firestore...');
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData?.role;
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Only sellers and admins can create transactions
    if (userRole !== 'seller' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateTransactionInput = await request.json();

    // Validate required fields
    if (!body.customerId || !body.amount || !body.paymentMethod || !body.transactionDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount
    if (body.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Set transaction type (defaults to 'payment')
    const transactionType = body.type || 'payment';
    
    // For credit notes, amount should be stored as negative
    const transactionAmount = transactionType === 'credit_note' ? -Math.abs(body.amount) : Math.abs(body.amount);

    // Get customer information
    const customerDoc = await adminDb.collection('customers').doc(body.customerId).get();
    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerDoc.data();

    // Verify seller owns this customer (unless admin)
    if (userRole === 'seller' && customerData?.sellerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create transaction
    const transaction: Omit<Transaction, 'id'> = {
      customerId: body.customerId,
      customerName: customerData?.businessName || customerData?.contactPerson || 'Unknown',
      amount: transactionAmount,
      type: transactionType,
      paymentMethod: body.paymentMethod,
      reference: body.reference || '',
      notes: body.notes || '',
      transactionDate: body.transactionDate,
      createdAt: new Date().toISOString(),
      sellerId: userRole === 'seller' ? userId : customerData?.sellerId || userId,
      createdBy: userId,
      ...(body.relatedOrderId ? { relatedOrderId: body.relatedOrderId } : {})
    };

    const docRef = await adminDb.collection('transactions').add(transaction);

    // Update all unpaid/partial orders for this customer
    const ordersQuery = adminDb.collection('orders')
      .where('customerId', '==', body.customerId)
      .where('sellerId', '==', transaction.sellerId)
      .where('paymentStatus', 'in', ['pending', 'partial', 'overdue']);
    
    const ordersSnapshot = await ordersQuery.get();
    
    // Calculate total paid for this customer from all transactions
    const allTransactionsQuery = adminDb.collection('transactions')
      .where('customerId', '==', body.customerId)
      .where('sellerId', '==', transaction.sellerId);
    
    const allTransactionsSnapshot = await allTransactionsQuery.get();
    let totalCustomerPayments = 0;
    allTransactionsSnapshot.forEach((doc) => {
      totalCustomerPayments += doc.data().amount || 0;
    });

    // Get all orders for this customer to allocate payments
    const ordersList: Array<{ id: string; total: number; totalPaid: number }> = [];
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      const orderTotal = orderData.total || 0;
      ordersList.push({
        id: doc.id,
        total: orderTotal,
        totalPaid: orderData.totalPaid || 0
      });
    });

    // Also include paid orders to get accurate total
    const paidOrdersQuery = adminDb.collection('orders')
      .where('customerId', '==', body.customerId)
      .where('sellerId', '==', transaction.sellerId)
      .where('paymentStatus', '==', 'paid');
    
    const paidOrdersSnapshot = await paidOrdersQuery.get();
    paidOrdersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      const orderTotal = orderData.total || 0;
      ordersList.push({
        id: doc.id,
        total: orderTotal,
        totalPaid: orderData.totalPaid || 0
      });
    });

    // Sort orders by creation date (oldest first) to allocate payments
    const allOrdersQuery = adminDb.collection('orders')
      .where('customerId', '==', body.customerId)
      .where('sellerId', '==', transaction.sellerId)
      .orderBy('createdAt', 'asc');
    
    const allOrdersSnapshot = await allOrdersQuery.get();
    let remainingPayment = totalCustomerPayments;

    // Allocate payments to orders
    const batch = adminDb.batch();
    allOrdersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      const orderTotal = orderData.total || 0;
      
      // Calculate how much to allocate to this order
      const amountToAllocate = Math.min(remainingPayment, orderTotal);
      remainingPayment -= amountToAllocate;
      
      const newTotalPaid = amountToAllocate;
      const newRemainingAmount = orderTotal - newTotalPaid;
      
      // Determine payment status
      let paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';
      if (newTotalPaid >= orderTotal) {
        paymentStatus = 'paid';
      } else if (newTotalPaid > 0) {
        paymentStatus = 'partial';
      }
      
      batch.update(doc.ref, {
        totalPaid: newTotalPaid,
        remainingAmount: newRemainingAmount,
        paymentStatus: paymentStatus,
        updatedAt: new Date().toISOString()
      });
    });

    // Commit the batch update
    await batch.commit();

    return NextResponse.json({
      success: true,
      transaction: { id: docRef.id, ...transaction },
      ordersUpdated: allOrdersSnapshot.size
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
