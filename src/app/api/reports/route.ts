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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getOrderFinancials = (order: { [key: string]: unknown }) => {
  const subtotal = toNumber(order.subtotal);
  const deliveryFee = toNumber(order.deliveryFee);
  const fallbackTotal = subtotal + deliveryFee;
  const total = toNumber(order.total) || fallbackTotal;

  const storedRemaining = order.remainingAmount !== undefined
    ? toNumber(order.remainingAmount)
    : null;

  const storedPaid = toNumber(order.totalPaid);

  const remaining = clamp(
    storedRemaining !== null ? storedRemaining : Math.max(total - storedPaid, 0),
    0,
    total
  );

  const paid = clamp(total - remaining, 0, total);

  return {
    total,
    paid,
    remaining,
  };
};

const resolveCustomerDisplayName = (customer: { [key: string]: unknown }) => {
  const extractString = (value: unknown) =>
    typeof value === 'string' ? value.trim() : '';

  const nameCandidates = [
    extractString(customer.businessName),
    extractString(customer.companyName),
    extractString(customer.name),
    extractString(customer.contactPerson),
  ];

  const displayName = nameCandidates.find((candidate) => candidate.length > 0);

  if (displayName) {
    return displayName;
  }

  const email = extractString(customer.email);
  if (email) {
    return email;
  }

  return 'Customer';
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly'; // daily, weekly, monthly, annually, custom
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const sellerId = searchParams.get('sellerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
    let startDateObj: Date;
    let endDateObj: Date;

    if (period === 'custom' && startDate && endDate) {
      // Custom date range
      startDateObj = startOfDay(new Date(startDate));
      endDateObj = endOfDay(new Date(endDate));
    } else {
      // Predefined periods
      switch (period) {
        case 'daily':
          startDateObj = startOfDay(selectedDate);
          endDateObj = endOfDay(selectedDate);
          break;
        case 'weekly':
          // Configure to start week on Monday (weekStartsOn: 1)
          startDateObj = startOfWeek(selectedDate, { weekStartsOn: 1 });
          endDateObj = endOfWeek(selectedDate, { weekStartsOn: 1 });
          break;
        case 'monthly':
          startDateObj = startOfMonth(selectedDate);
          endDateObj = endOfMonth(selectedDate);
          break;
        case 'annually':
          // Start of year to end of year
          startDateObj = new Date(selectedDate.getFullYear(), 0, 1);
          endDateObj = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        default:
          // Default to weekly with Monday start
          startDateObj = startOfWeek(selectedDate, { weekStartsOn: 1 });
          endDateObj = endOfWeek(selectedDate, { weekStartsOn: 1 });
      }
    }

    // Fetch orders for the seller within the date range
    const ordersQuery = adminDb.collection('orders')
      .where('sellerId', '==', targetSellerId)
      .where('createdAt', '>=', startDateObj.toISOString())
      .where('createdAt', '<=', endDateObj.toISOString())
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

    // Fetch customers for this seller (business metadata lives in `customers` collection)
    const customersQuery = adminDb.collection('customers')
      .where('sellerId', '==', targetSellerId);

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
      .where('transactionDate', '>=', startDateObj.toISOString())
      .where('transactionDate', '<=', endDateObj.toISOString());

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
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      orders,
      customers,
      products,
      transactions,
      summary: calculateSummary(orders, customers, transactions),
      trends: calculateTrends(orders, startDateObj, endDateObj),
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
  const orderFinancials = orders.map(getOrderFinancials);

  const totalRevenue = orderFinancials.reduce((sum, order) => sum + order.total, 0);

  const totalPaidFromTransactions = transactions.reduce(
    (sum, transaction) => sum + toNumber(transaction.amount),
    0
  );

  const totalPaidFromOrders = orderFinancials.reduce((sum, order) => sum + order.paid, 0);
  const totalOutstandingFromOrders = orderFinancials.reduce((sum, order) => sum + order.remaining, 0);

  const rawPaid = Math.max(totalPaidFromTransactions, totalPaidFromOrders);
  const outstandingDerived = Math.max(totalRevenue - rawPaid, 0);
  const totalOutstanding = clamp(
    Math.max(totalOutstandingFromOrders, outstandingDerived),
    0,
    totalRevenue
  );
  const totalPaidAmount = clamp(totalRevenue - totalOutstanding, 0, totalRevenue);

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
    const orderFinancials = customerOrders.map(getOrderFinancials);
    const totalSpent = orderFinancials.reduce((sum, order) => sum + order.total, 0);

    const outstandingFromOrders = orderFinancials.reduce((sum, order) => sum + order.remaining, 0);
    const paidFromOrders = orderFinancials.reduce((sum, order) => sum + order.paid, 0);

    const customerTransactions = transactions.filter(t => t.customerId === customer.id);
    const totalPaidFromTransactions = customerTransactions.reduce((sum, t) => sum + toNumber(t.amount), 0);

    const rawPaid = Math.max(totalPaidFromTransactions, paidFromOrders);
    const outstandingDerived = Math.max(totalSpent - rawPaid, 0);
    const totalOutstanding = clamp(
      Math.max(outstandingFromOrders, outstandingDerived),
      0,
      totalSpent
    );
    const totalPaid = clamp(totalSpent - totalOutstanding, 0, totalSpent);

    const paidOrdersCount = customerOrders.filter(order => order.paymentStatus === 'paid').length;
    const partialOrdersCount = customerOrders.filter(order => order.paymentStatus === 'partial').length;
    const unpaidOrdersCount = customerOrders.filter(order => ['pending', 'overdue'].includes(order.paymentStatus as string)).length;
    
    let paymentStatus = 'Good Standing';
    if (totalOutstanding > 0) {
      const outstandingRatio = totalSpent > 0 ? totalOutstanding / totalSpent : 0;
      if (unpaidOrdersCount > 0 || outstandingRatio >= 0.5) {
        paymentStatus = 'Has Outstanding';
      } else {
        paymentStatus = 'Partial Payments';
      }
    }

    const lastOrderDateValue = customerOrders.reduce<Date | null>((latest, order) => {
      if (typeof order.createdAt !== 'string') {
        return latest;
      }
      const currentDate = new Date(order.createdAt);
      if (Number.isNaN(currentDate.getTime())) {
        return latest;
      }
      if (!latest || currentDate > latest) {
        return currentDate;
      }
      return latest;
    }, null);

    const lastOrderDate = lastOrderDateValue ? lastOrderDateValue.toISOString() : null;
    
    return {
      id: customer.id,
      name: resolveCustomerDisplayName(customer),
      businessName: typeof customer.businessName === 'string' ? customer.businessName : undefined,
      contactPerson: typeof customer.contactPerson === 'string' ? customer.contactPerson : undefined,
      companyName: typeof customer.companyName === 'string' ? customer.companyName : undefined,
      email: typeof customer.email === 'string' ? customer.email : '',
      totalSpent,
      totalPaid,
      totalOutstanding,
      orderCount: customerOrders.length,
      paidOrders: paidOrdersCount,
      partialOrders: partialOrdersCount,
      unpaidOrders: unpaidOrdersCount,
      status: paymentStatus,
      lastOrderDate,
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  return customerStats;
}

function calculatePaymentAnalysis(
  orders: Array<{ id: string; [key: string]: unknown }>,
  transactions: Array<{ id: string; customerId: string; amount: number; [key: string]: unknown }>
) {
  const orderFinancials = orders.map(getOrderFinancials);

  const totalRevenue = orderFinancials.reduce((sum, order) => sum + order.total, 0);
  const paidFromOrders = orderFinancials.reduce((sum, order) => sum + order.paid, 0);
  const outstandingFromOrders = orderFinancials.reduce((sum, order) => sum + order.remaining, 0);

  const totalPaidFromTransactions = transactions.reduce(
    (sum, transaction) => sum + toNumber(transaction.amount),
    0
  );

  const rawPaid = Math.max(totalPaidFromTransactions, paidFromOrders);
  const outstandingDerived = Math.max(totalRevenue - rawPaid, 0);
  const totalOutstanding = clamp(
    Math.max(outstandingFromOrders, outstandingDerived),
    0,
    totalRevenue
  );
  const totalPaidAmount = clamp(totalRevenue - totalOutstanding, 0, totalRevenue);

  const partialOrdersPaid = orders.reduce((sum, order, index) => {
    return order.paymentStatus === 'partial' ? sum + orderFinancials[index].paid : sum;
  }, 0);

  const fullyPaidValue = clamp(totalPaidAmount - partialOrdersPaid, 0, totalRevenue);

  const result: Array<{ name: string; value: number; percentage: number }> = [];

  if (fullyPaidValue > 0) {
    result.push({
      name: 'Fully Paid',
      value: fullyPaidValue,
      percentage: totalRevenue > 0 ? (fullyPaidValue / totalRevenue) * 100 : 0,
    });
  }

  if (partialOrdersPaid > 0) {
    result.push({
      name: 'Partial (Paid Portion)',
      value: partialOrdersPaid,
      percentage: totalRevenue > 0 ? (partialOrdersPaid / totalRevenue) * 100 : 0,
    });
  }

  if (totalOutstanding > 0) {
    result.push({
      name: 'Outstanding',
      value: totalOutstanding,
      percentage: totalRevenue > 0 ? (totalOutstanding / totalRevenue) * 100 : 0,
    });
  }

  return result;
}
