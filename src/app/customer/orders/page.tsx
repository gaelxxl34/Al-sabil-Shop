'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import CustomerHeader from '@/components/CustomerHeader';
import CustomerPageSkeleton from '@/components/CustomerPageSkeleton';
import CustomerMobileNav from '@/components/CustomerMobileNav';
import Invoice from '@/components/Invoice';
import { orderApi, customerApi } from '@/lib/api-client';
import { Order } from '@/types/cart';
import { Customer } from '@/types/customer';
import { FiShoppingCart, FiEye, FiFileText, FiClock, FiCheck, FiX } from 'react-icons/fi';
import Link from 'next/link';

interface OrderStats {
  total: number;
  pending: number;
  preparing: number;
  delivered: number;
  cancelled: number;
}

interface StatusFilter {
  id: string;
  label: string;
}

const statusFilters: StatusFilter[] = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <FiClock className="w-4 h-4" />,
    description: 'Your order is being reviewed'
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <FiCheck className="w-4 h-4" />,
    description: 'Your order has been confirmed and is being prepared'
  },
  prepared: {
    label: 'Prepared',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <FiShoppingCart className="w-4 h-4" />,
    description: 'Your order is ready for pickup or delivery'
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <FiCheck className="w-4 h-4" />,
    description: 'Your order has been successfully delivered'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <FiX className="w-4 h-4" />,
    description: 'Your order has been cancelled'
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const convertOrderItems = (order: Order) => {
  return order.items.map(item => ({
    ...item,
    image: '🍽️' // Default food emoji, can be enhanced with real product images
  }));
};

export default function CustomerOrders() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Calculate stats
  const stats: OrderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => ['confirmed', 'prepared'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  // Filter orders
  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  // Auto refresh has been removed - users will need to manually refresh the page
  // or navigate away and back to see updates

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching orders for customer...');
      
      const response = await orderApi.getOrders();
      console.log('Orders response:', response);
      
      // Extract the data array from the response
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInvoice = async (order: Order) => {
    try {
      setLoadingInvoice(true);
      setSelectedOrder(order);
      
      // Get current user (customer) data from auth context
      if (user?.uid) {
        const customerResponse = await customerApi.getCustomer(user.uid);
        setSelectedCustomer(customerResponse.data);
      }
      
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Error loading invoice data:', error);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const generateInvoiceNumber = (order: Order) => {
    const date = new Date(order.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const orderSuffix = order.id.slice(-6).toUpperCase();
    return `INV-${year}${month}-${orderSuffix}`;
  };

  const InvoiceModal = () => {
    if (!showInvoiceModal || !selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Invoice Preview</h3>
              <button 
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedOrder(null);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-4">
            {loadingInvoice ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="ml-2 text-gray-600">Loading invoice...</span>
              </div>
            ) : selectedCustomer ? (
              <Invoice 
                order={selectedOrder}
                customer={selectedCustomer}
                invoiceNumber={generateInvoiceNumber(selectedOrder)}
              />
            ) : (
              <div className="text-center text-gray-600 h-64 flex items-center justify-center">
                <div>
                  <FiFileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Unable to load invoice data</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading || isLoading) {
    return <CustomerPageSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please log in to view your orders</p>
          <Link 
            href="/login" 
            className="bg-elegant-red-600 text-white px-6 py-2 rounded-lg hover:bg-elegant-red-700 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <CustomerHeader />
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
            <p className="text-gray-600 text-sm sm:text-base">Track and manage your order history</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <FiX className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
              <button 
                onClick={fetchOrders}
                className="mt-2 text-red-600 hover:text-red-800 font-medium"
              >
                Try again
              </button>
            </div>
          )}

          {/* Order Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Orders</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs sm:text-sm text-gray-600">Pending</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.preparing}</div>
                <div className="text-xs sm:text-sm text-gray-600">In Progress</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.delivered}</div>
                <div className="text-xs sm:text-sm text-gray-600">Delivered</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-red-700">{stats.cancelled}</div>
                <div className="text-xs sm:text-sm text-gray-600">Cancelled</div>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Filter by Status</h3>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedStatus(filter.id)}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    selectedStatus === filter.id
                      ? "bg-elegant-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-8xl mb-6">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No orders found</h2>
              <p className="text-gray-600 mb-8">
                {selectedStatus === "all" 
                  ? "You haven't placed any orders yet." 
                  : `No orders with status "${statusFilters.find(f => f.id === selectedStatus)?.label}".`}
              </p>
              <Link 
                href="/customer/dashboard"
                className="bg-elegant-red-600 text-white px-8 py-3 rounded-lg hover:bg-elegant-red-700 transition-colors font-semibold inline-flex items-center gap-2"
              >
                <FiShoppingCart className="w-5 h-5" />
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const orderItems = convertOrderItems(order);
                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                    {/* Order Header */}
                    <div className="p-4 sm:p-6 border-b border-gray-200">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-gray-900">{order.id}</h3>
                            <p className="text-gray-600 text-xs sm:text-sm">Placed on {formatDate(order.createdAt)}</p>
                          </div>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${statusConfig[order.status as keyof typeof statusConfig].color}`}>
                            {statusConfig[order.status as keyof typeof statusConfig].icon}
                            {statusConfig[order.status as keyof typeof statusConfig].label}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="text-center sm:text-right">
                            <div className="text-lg sm:text-xl font-bold text-gray-900">€{order.total.toFixed(2)}</div>
                            <div className="text-xs sm:text-sm text-gray-600">{order.items.length} items</div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <Link 
                              href={`/customer/orders/${order.id}`}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <FiEye className="w-4 h-4" />
                              <span className="text-sm sm:text-base">View</span>
                            </Link>
                            {(order.status === "confirmed" || order.status === "prepared" || order.status === "delivered") && (
                              <button 
                                onClick={() => handleViewInvoice(order)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                              >
                                <FiFileText className="w-4 h-4" />
                                <span className="text-sm sm:text-base">Invoice</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Status Info */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
                      <p className="text-xs sm:text-sm text-gray-700">
                        {statusConfig[order.status as keyof typeof statusConfig].description}
                        {order.deliveryDate && order.status !== "cancelled" && (
                          <span className="ml-1">• Expected delivery: {formatDate(order.deliveryDate!)}</span>
                        )}
                      </p>
                    </div>

                    {/* Order Items Preview */}
                    {orderItems.length > 0 && (
                      <div className="p-4 sm:p-6">
                        <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Order Items</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {orderItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg flex items-center justify-center">
                                {item.image}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">{item.name}</p>
                                <p className="text-gray-600 text-xs">Qty: {item.quantity} • €{item.price.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Invoice Modal */}
        <InvoiceModal />

        <CustomerMobileNav currentPage="orders" />
      </div>
    </>
  );
}
