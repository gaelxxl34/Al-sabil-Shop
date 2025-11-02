// src/app/api/reports/route.ts
/**
 * Financial Reports API
 * 
 * This API generates comprehensive financial reports synchronized with the transactions page.
 * 
 * DATA SYNCHRONIZATION:
 * - Payment data is calculated from BOTH transactions collection and order.totalPaid
 * - Transactions collection is the source of truth for payments (matches transaction page)
 * - order.totalPaid is used as fallback for backward compatibility
 * - We use Math.max() to ensure no payments are missed from either source
 * 
 * This ensures reports show the same payment data as the transactions page.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly'; // daily, weekly, monthly
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
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

    // Only sellers and admins can access reports
    if (userRole !== 'seller' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Use the authenticated user's ID if no sellerId specified
    const targetSellerId = sellerId || decodedToken.uid;

    // Verify the seller can access this data
    if (userRole === 'seller' && decodedToken.uid !== targetSellerId) {
      return NextResponse.json({ error: 'Access denied to this seller data' }, { status: 403 });
    }

    // Calculate date range based on period
    const selectedDate = new Date(date);
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'daily':
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
        break;
      case 'weekly':
        // Configure to start week on Monday (weekStartsOn: 1)
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        break;
      case 'monthly':
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
        break;
      default:
        // Default to weekly with Monday start
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
    }

    // Fetch orders for the seller within the date range
    const ordersQuery = adminDb.collection('orders')
      .where('sellerId', '==', targetSellerId)
      .where('createdAt', '>=', startDate.toISOString())
      .where('createdAt', '<=', endDate.toISOString())
      .orderBy('createdAt', 'desc');

    const ordersSnapshot = await ordersQuery.get();
    const orders: Array<{
      id: string;
      [key: string]: unknown;
    }> = [];

    ordersSnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Fetch customers for this seller
    const customersQuery = adminDb.collection('users')
      .where('sellerId', '==', targetSellerId)
      .where('role', '==', 'customer');

    const customersSnapshot = await customersQuery.get();
    const customers: Array<{
      id: string;
      [key: string]: unknown;
    }> = [];

    customersSnapshot.forEach((doc) => {
      customers.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Fetch products for this seller
    const productsQuery = adminDb.collection('products')
      .where('sellerId', '==', targetSellerId);

    const productsSnapshot = await productsQuery.get();
    const products: Array<{
      id: string;
      [key: string]: unknown;
    }> = [];

    productsSnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Fetch transactions for this seller to calculate actual payments
    const transactionsQuery = adminDb.collection('transactions')
      .where('sellerId', '==', targetSellerId)
      .where('transactionDate', '>=', startDate.toISOString())
      .where('transactionDate', '<=', endDate.toISOString());

    const transactionsSnapshot = await transactionsQuery.get();
    const transactions: Array<{
      id: string;
      customerId: string;
      amount: number;
      [key: string]: unknown;
    }> = [];

    transactionsSnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        customerId: data.customerId,
        amount: data.amount || 0,
        ...data,
      });
    });

    // Calculate report data
    const reportData = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      orders,
      customers,
      products,
      transactions,
      summary: calculateSummary(orders, customers, transactions),
      trends: calculateTrends(orders, startDate, endDate),
      topProducts: calculateTopProducts(orders),
      topCustomers: calculateTopCustomers(orders, customers, transactions),
      paymentAnalysis: calculatePaymentAnalysis(orders, transactions),
    };

    return NextResponse.json({
      success: true,
      data: reportData,
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateSummary(
  orders: Array<{ id: string; [key: string]: unknown }>, 
  customers: Array<{ id: string; [key: string]: unknown }>,
  transactions: Array<{ id: string; customerId: string; amount: number; [key: string]: unknown }>
) {
  const totalRevenue = orders.reduce((sum, order) => sum + ((order.total as number) || 0), 0);
  
  // Calculate total paid from transactions (this is the source of truth)
  const totalPaidFromTransactions = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Also include payments recorded directly on orders (for backward compatibility)
  const totalPaidFromOrders = orders.reduce((sum, order) => sum + ((order.totalPaid as number) || 0), 0);
  
  // Use the maximum of the two to ensure we don't miss any payments
  const totalPaidAmount = Math.max(totalPaidFromTransactions, totalPaidFromOrders);
  
  const totalOutstanding = totalRevenue - totalPaidAmount;
  
  const totalOrders = orders.length;
  const paidOrders = orders.filter(order => order.paymentStatus === 'paid').length;
  const partialOrders = orders.filter(order => order.paymentStatus === 'partial').length;
  const unpaidOrders = orders.filter(order => ['pending', 'overdue'].includes(order.paymentStatus as string)).length;
  
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const deliveryRevenue = orders.reduce((sum, order) => sum + ((order.deliveryFee as number) || 0), 0);
  const productRevenue = totalRevenue - deliveryRevenue;
  
  const activeCustomers = customers.filter(customer => 
    orders.some(order => order.customerId === customer.id)
  ).length;

  return {
    totalRevenue,
    totalPaidAmount,
    totalOutstanding,
    totalOrders,
    paidOrders,
    partialOrders,
    unpaidOrders,
    averageOrderValue,
    deliveryRevenue,
    productRevenue,
    totalCustomers: customers.length,
    activeCustomers,
  };
}

function calculateTrends(orders: Array<{ id: string; [key: string]: unknown }>, startDate: Date, endDate: Date) {
  const trends: Array<{ date: string; revenue: number; orders: number }> = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayOrders = orders.filter(order => 
      format(new Date(order.createdAt as string), 'yyyy-MM-dd') === dateStr
    );
    
    trends.push({
      date: format(currentDate, 'MMM dd'),
      revenue: dayOrders.reduce((sum, order) => sum + ((order.total as number) || 0), 0),
      orders: dayOrders.length
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return trends;
}

function calculateTopProducts(orders: Array<{ id: string; [key: string]: unknown }>) {
  const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
  
  orders.forEach(order => {
    const items = order.items as Array<{
      productId: string;
      name: string;
      quantity: number;
      total?: number;
      price: number;
    }> | undefined;
    
    items?.forEach((item) => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = {
          name: item.name,
          quantity: 0,
          revenue: 0
        };
      }
      productStats[item.productId].quantity += item.quantity;
      productStats[item.productId].revenue += item.total || (item.price * item.quantity);
    });
  });

  return Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

function calculateTopCustomers(
  orders: Array<{ id: string; [key: string]: unknown }>, 
  customers: Array<{ id: string; [key: string]: unknown }>,
  transactions: Array<{ id: string; customerId: string; amount: number; [key: string]: unknown }>
) {
  const customerStats = customers.map(customer => {
    const customerOrders = orders.filter(order => order.customerId === customer.id);
    const totalSpent = customerOrders.reduce((sum, order) => sum + ((order.total as number) || 0), 0);
    
    // Calculate total paid from transactions for this customer
    const customerTransactions = transactions.filter(t => t.customerId === customer.id);
    const totalPaidFromTransactions = customerTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Also check order.totalPaid for backward compatibility
    const totalPaidFromOrders = customerOrders.reduce((sum, order) => sum + ((order.totalPaid as number) || 0), 0);
    
    // Use the maximum to ensure we capture all payments
    const totalPaid = Math.max(totalPaidFromTransactions, totalPaidFromOrders);
    const totalOutstanding = totalSpent - totalPaid;
    
    const paidOrdersCount = customerOrders.filter(order => order.paymentStatus === 'paid').length;
    const partialOrdersCount = customerOrders.filter(order => order.paymentStatus === 'partial').length;
    const unpaidOrdersCount = customerOrders.filter(order => ['pending', 'overdue'].includes(order.paymentStatus as string)).length;
    
    let paymentStatus = 'Good Standing';
    if (totalOutstanding > 0) {
      if (unpaidOrdersCount > 0 || partialOrdersCount > 2) {
        paymentStatus = 'Has Outstanding';
      } else if (partialOrdersCount > 0) {
        paymentStatus = 'Partial Payments';
      }
    }
    
    return {
      id: customer.id,
      name: (customer.name as string) && (customer.name as string).trim() 
        ? (customer.name as string).trim() 
        : `Customer (${customer.email})`,
      email: customer.email,
      totalSpent,
      totalPaid,
      totalOutstanding,
      orderCount: customerOrders.length,
      paidOrders: paidOrdersCount,
      partialOrders: partialOrdersCount,
      unpaidOrders: unpaidOrdersCount,
      status: paymentStatus
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  return customerStats;
}

function calculatePaymentAnalysis(
  orders: Array<{ id: string; [key: string]: unknown }>,
  transactions: Array<{ id: string; customerId: string; amount: number; [key: string]: unknown }>
) {
  const totalRevenue = orders.reduce((sum, order) => sum + ((order.total as number) || 0), 0);
  
  // Calculate total paid from transactions (source of truth)
  const totalPaidFromTransactions = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Also check orders for backward compatibility
  const totalPaidFromOrders = orders.reduce((sum, order) => sum + ((order.totalPaid as number) || 0), 0);
  
  // Use maximum to capture all payments
  const totalPaidAmount = Math.max(totalPaidFromTransactions, totalPaidFromOrders);
  const totalOutstanding = totalRevenue - totalPaidAmount;

  // Break down by payment status
  const partialOrdersTotal = orders
    .filter(order => order.paymentStatus === 'partial')
    .reduce((sum, order) => sum + ((order.total as number) || 0), 0);
    
  const partialOrdersPaid = orders
    .filter(order => order.paymentStatus === 'partial')
    .reduce((sum, order) => sum + ((order.totalPaid as number) || 0), 0);

  const result = [
    { 
      name: 'Paid', 
      value: totalPaidAmount, 
      percentage: totalRevenue > 0 ? (totalPaidAmount / totalRevenue) * 100 : 0 
    },
    { 
      name: 'Outstanding', 
      value: totalOutstanding, 
      percentage: totalRevenue > 0 ? (totalOutstanding / totalRevenue) * 100 : 0 
    }
  ];

  // Only include partial and pending if they exist
  if (partialOrdersTotal > 0) {
    result.push({
      name: 'Partial',
      value: partialOrdersPaid,
      percentage: totalRevenue > 0 ? (partialOrdersPaid / totalRevenue) * 100 : 0
    });
  }

  return result;
}
