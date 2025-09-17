'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SellerSidebar from '@/components/SellerSidebar';
import SellerSidebarDrawer from '@/components/SellerSidebarDrawer';
import SellerGuard from '@/components/SellerGuard';
import { useAuth } from '@/components/AuthProvider';
import { orderApi } from '@/lib/api-client';
import { Order } from '@/types/cart';
import { FiPackage, FiCheckCircle, FiClock, FiXCircle, FiEye, FiDollarSign, FiTruck, FiAlertCircle, FiTrash2, FiX } from 'react-icons/fi';
import { Skeleton } from '@/components/SkeletonLoader';
import { useToast } from '@/contexts/ToastContext';

type OrderStatus = 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <FiClock className="inline mr-1" />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800',
    icon: <FiCheckCircle className="inline mr-1" />,
  },
  prepared: {
    label: 'Prepared',
    color: 'bg-purple-100 text-purple-800',
    icon: <FiPackage className="inline mr-1" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800',
    icon: <FiTruck className="inline mr-1" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    icon: <FiXCircle className="inline mr-1" />,
  },
};

const paymentStatusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <FiClock className="inline mr-1" />,
  },
  partial: {
    label: 'Partial',
    color: 'bg-orange-100 text-orange-800',
    icon: <FiDollarSign className="inline mr-1" />,
  },
  paid: {
    label: 'Paid',
    color: 'bg-green-100 text-green-800',
    icon: <FiCheckCircle className="inline mr-1" />,
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-red-100 text-red-800',
    icon: <FiAlertCircle className="inline mr-1" />,
  },
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function SellerOrdersPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'credit' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const hasFetchedInitialRef = useRef(false); // Prevent duplicate initial fetch (e.g. React Strict Mode)

  const fetchOrders = async (forceRefresh = false) => {
    // Only apply the initial fetch guard if this is not a forced refresh
    if (!forceRefresh && hasFetchedInitialRef.current) return;
    
    if (!forceRefresh) {
      hasFetchedInitialRef.current = true;
    }
    
    try {
      console.log('📡 Fetching orders...', { forceRefresh, user: !!user, userData: userData?.role });
      setIsLoading(true);
      setError(null);
      
      const response = await orderApi.getOrders();
      
      console.log('📦 Orders API response:', { success: response.success, dataLength: response.data?.length });
      
      if (response.success && response.data) {
        setOrders(response.data);
        console.log('✅ Orders loaded successfully:', response.data.length, 'orders');
      } else {
        console.log('⚠️ No orders data in response');
        setOrders([]);
      }
    } catch (error: unknown) {
      console.error('❌ Error fetching orders:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to load orders';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check if you are logged in and try again.';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage = 'Session expired. Please log in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Only fetch after we know we have a logged-in seller. This avoids a race where
  // the SellerGuard redirects (causing the fetch to be aborted => TypeError: Failed to fetch).
  
  // Auto refresh has been removed - users will need to manually refresh the page
  // or navigate away and back to see updates

  useEffect(() => {
    console.log('🔍 Orders page useEffect triggered:', { 
      user: !!user, 
      userData: userData?.role, 
      authLoading, 
      isLoading 
    });
    
    // Wait for auth to complete loading
    if (authLoading) {
      console.log('⏳ Orders page: waiting for auth to complete...');
      return;
    }
    
    if (!userData || userData.role !== 'seller') {
      console.log('⚠️ Orders page: waiting for seller user data...', { userData: userData?.role });
      return; // wait for proper role
    }
    if (!user) {
      console.log('⚠️ Orders page: waiting for firebase auth user...');
      return; // wait for firebase auth user
    }
    
    console.log('✅ Orders page: conditions met, fetching orders...');
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, authLoading]);

  // If user data loaded and it's NOT a seller, let SellerGuard handle redirect without firing fetch.

  const showToastNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    showToast({
      type,
      title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Update',
      message,
      duration: 5000
    });
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await orderApi.updateOrder(orderId, { status: newStatus });
      
      // Get order details for user-friendly message
      const order = orders.find(o => o.id === orderId);
      const orderNumber = `#${orderId.slice(-6).toUpperCase()}`;
      const firstItemName = order?.items?.[0]?.name || 'order';
      
      showToastNotification(
        `Order ${orderNumber} for ${firstItemName} status updated to ${newStatus}`, 
        'success'
      );
      await fetchOrders(true); // Force refresh orders
    } catch (error) {
      console.error('Error updating order status:', error);
      showToastNotification('Failed to update order status', 'error');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModalOrder || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      showToastNotification('Please enter a valid payment amount', 'error');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const remainingAmount = paymentModalOrder.remainingAmount || paymentModalOrder.total;

    if (amount > remainingAmount) {
      showToastNotification(`Payment amount cannot exceed remaining balance of €${remainingAmount.toFixed(2)}`, 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      await orderApi.updateOrder(paymentModalOrder.id, {
        paymentAmount: amount,
        paymentMethod,
        paymentNotes
      });

      const orderNumber = `#${paymentModalOrder.id.slice(-6).toUpperCase()}`;
      showToastNotification(
        `Payment of €${amount.toFixed(2)} recorded for order ${orderNumber}`, 
        'success'
      );

      // Reset form and close modal
      setPaymentModalOrder(null);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentMethod('cash');

      await fetchOrders(true); // Force refresh orders
    } catch (error) {
      console.error('Error recording payment:', error);
      showToastNotification('Failed to record payment', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openPaymentModal = (order: Order) => {
    setPaymentModalOrder(order);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentMethod('cash');
  };

  const handleDeleteOrder = async (orderId: string, orderNumber?: string) => {
    const order = orders.find(o => o.id === orderId);
    const displayNumber = orderNumber || `#${orderId.slice(-6).toUpperCase()}`;
    const firstItemName = order?.items?.[0]?.name || 'order';
    
    if (!confirm(`Are you sure you want to delete ${displayNumber} for ${firstItemName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await orderApi.deleteOrder(orderId);
      showToastNotification(
        `Order ${displayNumber} for ${firstItemName} has been deleted successfully`, 
        'success'
      );
      await fetchOrders(true); // Force refresh orders list
    } catch (error: unknown) {
      console.error('Error deleting order:', error);
      
      // Show specific error message based on the error
      let errorMessage = 'Failed to delete order. Please try again.';
      
      const errorObj = error as { status?: number; message?: string };
      if (errorObj.status === 400) {
        errorMessage = 'Cannot delete orders that are already processed.';
      } else if (errorObj.status === 403) {
        errorMessage = 'You do not have permission to delete this order.';
      } else if (errorObj.status === 404) {
        errorMessage = 'Order not found.';
      } else if (errorObj.message) {
        errorMessage = errorObj.message;
      }
      
      showToastNotification(errorMessage, 'error');
    }
  };



  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  const getAvailableActions = (order: Order) => {
    const actions = [];
    
    // Add view details button for all orders
    actions.push(
      <Link
        key="view"
        href={`/seller/orders/${order.id}`}
        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        <FiEye className="inline mr-1" />
        View
      </Link>
    );

    switch (order.status) {
      case 'pending':
        actions.push(
          <button
            key="confirm"
            onClick={() => handleStatusChange(order.id, 'confirmed')}
            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Confirm
          </button>
        );
        actions.push(
          <button
            key="cancel"
            onClick={() => handleStatusChange(order.id, 'cancelled')}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Cancel
          </button>
        );
        break;
      case 'confirmed':
        actions.push(
          <button
            key="prepare"
            onClick={() => handleStatusChange(order.id, 'prepared')}
            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Mark Prepared
          </button>
        );
        break;
      case 'prepared':
        actions.push(
          <button
            key="deliver"
            onClick={() => handleStatusChange(order.id, 'delivered')}
            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Mark Delivered
          </button>
        );
        break;
      case 'delivered':
        if (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') {
          actions.push(
            <button
              key="recordPayment"
              onClick={() => openPaymentModal(order)}
              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <FiDollarSign className="inline mr-1" />
              Record Payment
            </button>
          );
        }
        break;
    }



    // Add delete button only for pending or cancelled orders
    if (['pending', 'cancelled'].includes(order.status)) {
      actions.push(
        <button
          key="delete"
          onClick={() => handleDeleteOrder(order.id, `#${order.id.slice(-6).toUpperCase()}`)}
          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          title="Delete order"
        >
          <FiTrash2 className="inline mr-1" />
          Delete
        </button>
      );
    }

    return actions;
  };

  // Toast Component
  // Skeleton loading component for seller orders page
  const OrdersPageSkeleton = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
        <SellerSidebar />
      </div>
      <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton height="h-8" width="w-8" rounded="rounded-lg" />
              <Skeleton height="h-8" width="w-32" />
            </div>
            <Skeleton height="h-4" width="w-48" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton height="h-12" width="w-12" rounded="rounded-xl" />
                  <div className="flex-1">
                    <Skeleton height="h-4" width="w-20" className="mb-2" />
                    <Skeleton height="h-6" width="w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton height="h-10" width="w-32" rounded="rounded-lg" />
              <Skeleton height="h-10" width="w-32" rounded="rounded-lg" />
              <Skeleton height="h-10" width="w-32" rounded="rounded-lg" />
              <Skeleton height="h-10" width="w-24" rounded="rounded-lg" />
            </div>
          </div>

          {/* Orders Table Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} height="h-4" width="w-20" />
                ))}
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <Skeleton height="h-5" width="w-24" className="mb-1" />
                      <Skeleton height="h-3" width="w-16" />
                    </div>
                    <div>
                      <Skeleton height="h-4" width="w-32" className="mb-1" />
                      <Skeleton height="h-3" width="w-20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton height="h-6" width="w-20" rounded="rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton height="h-6" width="w-16" rounded="rounded-full" />
                    </div>
                    <div>
                      <Skeleton height="h-5" width="w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton height="h-8" width="w-8" rounded="rounded-lg" />
                      <Skeleton height="h-8" width="w-8" rounded="rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  if (authLoading || isLoading) {
    return <OrdersPageSkeleton />;
  }

  return (
    <SellerGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        
        {/* Sidebar - Fixed positioning */}
        <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
          <SellerSidebar />
        </div>

      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-20 bg-gray-900 text-white p-3 rounded-lg shadow-lg hover:bg-gray-800 transition-all duration-200"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Sidebar Drawer */}
      <SellerSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
        <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiPackage className="text-red-500 text-3xl" />
                Orders Management
              </h1>
              <p className="text-gray-600 mt-1 text-base">
                Manage your orders from pending to delivery and payment tracking.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500 bg-white text-gray-900"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="prepared">Prepared</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiXCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
              <button 
                onClick={() => fetchOrders(true)}
                className="mt-2 text-red-600 hover:text-red-800 font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Retrying...' : 'Try again'}
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiAlertCircle className="text-yellow-600 text-2xl mr-3" />
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {orders.filter(o => o.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiClock className="text-blue-600 text-2xl mr-3" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {orders.filter(o => ['confirmed', 'prepared'].includes(o.status)).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiTruck className="text-green-600 text-2xl mr-3" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Delivered</p>
                  <p className="text-2xl font-bold text-green-800">
                    {orders.filter(o => o.status === 'delivered').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-700 text-2xl mr-3 font-bold">€</div>
                <div>
                  <p className="text-sm text-red-700 font-medium">Outstanding</p>
                  <p className="text-2xl font-bold text-red-800">
                    {orders.filter(o => ['pending', 'partial'].includes(o.paymentStatus) && o.status === 'delivered').length}
                  </p>
                  <p className="text-xs text-red-600">
                    €{orders.filter(o => ['pending', 'partial'].includes(o.paymentStatus) && o.status === 'delivered')
                      .reduce((sum, o) => sum + (o.remainingAmount || o.total), 0).toFixed(2)} due
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total (€)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-4 font-mono text-sm text-gray-900">{order.id}</td>
                      <td className="px-4 py-4 text-gray-800 font-medium">Customer {order.customerId.slice(-4)}</td>
                      <td className="px-4 py-4 text-gray-700 text-sm">
                        <div>{formatDate(order.createdAt)}</div>
                        {order.deliveryDate && (
                          <div className="text-xs text-gray-500">
                            Delivery: {formatDate(order.deliveryDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-700">{order.items.length}</td>
                      <td className="px-4 py-4 text-gray-900 font-semibold">
                        <div>€{order.total.toFixed(2)}</div>
                        {(order.paymentStatus === 'partial' || order.totalPaid > 0) && (
                          <div className="text-xs text-gray-500">
                            Paid: €{(order.totalPaid || 0).toFixed(2)}
                          </div>
                        )}
                        {(order.remainingAmount > 0 && order.paymentStatus !== 'paid') && (
                          <div className="text-xs text-orange-600">
                            Due: €{(order.remainingAmount || order.total).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[order.status].color}`}>
                          {statusConfig[order.status].icon}
                          {statusConfig[order.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${paymentStatusConfig[order.paymentStatus].color}`}>
                          {paymentStatusConfig[order.paymentStatus].icon}
                          {paymentStatusConfig[order.paymentStatus].label}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {order.paymentMethod === 'credit' ? 'Credit' : 'Cash'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {getAvailableActions(order)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  No orders found for the selected filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Payment - Order #{paymentModalOrder.id.slice(-6).toUpperCase()}
              </h3>
              <button
                onClick={() => setPaymentModalOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Total:</span>
                  <span className="font-medium">€{paymentModalOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Already Paid:</span>
                  <span className="font-medium text-green-600">€{(paymentModalOrder.totalPaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-bold text-red-600">€{(paymentModalOrder.remainingAmount || paymentModalOrder.total).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentModalOrder.remainingAmount || paymentModalOrder.total}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_transfer' | 'credit' | 'other')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit">Credit</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Payment reference, notes, etc."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPaymentModalOrder(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={isProcessingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </SellerGuard>
  );
}
