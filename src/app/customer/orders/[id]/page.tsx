'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import CustomerHeader from '@/components/CustomerHeader';
import CustomerPageSkeleton from '@/components/CustomerPageSkeleton';
import CustomerMobileNav from '@/components/CustomerMobileNav';
import Invoice from '@/components/Invoice';
import { orderApi, customerApi } from '@/lib/api-client';
import { Order } from '@/types/cart';
import { Customer } from '@/types/customer';
import { 
  FiArrowLeft, 
  FiPackage, 
  FiUser, 
  FiMapPin, 
  FiCreditCard, 
  FiFileText, 
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiXCircle
} from 'react-icons/fi';

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <FiClock className="w-4 h-4" />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800',
    icon: <FiCheckCircle className="w-4 h-4" />,
  },
  prepared: {
    label: 'Prepared',
    color: 'bg-purple-100 text-purple-800',
    icon: <FiPackage className="w-4 h-4" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800',
    icon: <FiTruck className="w-4 h-4" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    icon: <FiXCircle className="w-4 h-4" />,
  },
};

export default function CustomerOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { user, loading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrderData = useCallback(async () => {
    try {
      setIsLoading(true);
      const orderResponse = await orderApi.getOrder(orderId);
      const orderData = orderResponse.data;
      setOrder(orderData);

      // Fetch customer details for the business info on invoice
      const customerResponse = await customerApi.getMe();
      setCustomer(customerResponse.data.customer);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId && user) {
      fetchOrderData();
    }
  }, [orderId, user, fetchOrderData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateInvoiceNumber = (order: Order) => {
    const date = new Date(order.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const orderSuffix = order.id.slice(-6).toUpperCase();
    return `INV-${year}${month}-${orderSuffix}`;
  };

  if (loading || isLoading) {
    return <CustomerPageSkeleton />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerHeader />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">The order you&apos;re looking for doesn&apos;t exist.</p>
            <button
              onClick={() => router.push('/customer/orders')}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <CustomerHeader />
      <CustomerMobileNav />
      
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/customer/orders')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order.id.slice(-8).toUpperCase()}
              </h1>
              <p className="text-gray-600">Placed {formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Status Badge */}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold gap-2 ${statusConfig[order.status].color}`}>
            {statusConfig[order.status].icon}
            {statusConfig[order.status].label}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            {customer && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiUser className="text-blue-600" />
                  Delivery Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business Name</label>
                    <p className="text-gray-900 font-medium">{customer.businessName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact Person</label>
                    <p className="text-gray-900">{customer.contactPerson}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <FiMapPin className="w-4 h-4" />
                      Delivery Address
                    </label>
                    <p className="text-gray-900">{order.deliveryAddress || customer.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiPackage className="text-red-600" />
                  Order Items
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-gray-600">€{item.price.toFixed(2)} per {item.unit}</span>
                          <span className="text-gray-600">Quantity: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">€{item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Notes */}
            {order.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiFileText className="text-green-600" />
                  Delivery Notes
                </h2>
                <p className="text-gray-700">{order.notes}</p>
              </div>
            )}

            {/* Invoice Section - Only show when order is confirmed or later */}
            {(order.status === 'confirmed' || order.status === 'prepared' || order.status === 'delivered') && customer && (
              <Invoice 
                order={order}
                customer={customer}
                invoiceNumber={generateInvoiceNumber(order)}
              />
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">€{order.subtotal.toFixed(2)}</span>
                </div>
                
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-medium text-gray-900">€{order.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-xl font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-red-600">€{order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FiCreditCard className="w-4 h-4" />
                  Payment Method
                </h3>
                <p className="text-gray-700">
                  {order.paymentMethod === 'credit' ? 'Credit Account' : 'Cash on Delivery'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Status: <span className="capitalize">{order.paymentStatus}</span>
                </p>
              </div>

              {/* Order Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Order Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${order.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    <span className={order.status === 'pending' ? 'text-yellow-700' : 'text-green-700'}>Order Placed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      ['confirmed', 'prepared', 'delivered'].includes(order.status) ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                    <span className={['confirmed', 'prepared', 'delivered'].includes(order.status) ? 'text-green-700' : 'text-gray-500'}>Order Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      ['prepared', 'delivered'].includes(order.status) ? 'bg-green-500' : 'bg-gray-300'
                    }`}></div>
                    <span className={['prepared', 'delivered'].includes(order.status) ? 'text-green-700' : 'text-gray-500'}>Order Prepared</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={order.status === 'delivered' ? 'text-green-700' : 'text-gray-500'}>Order Delivered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
