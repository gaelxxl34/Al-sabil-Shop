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
import { Transaction } from '@/types/transaction';
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
  FiXCircle,
  FiList,
  FiDollarSign
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
  
  // Transaction history state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchOrderData = useCallback(async () => {
    try {
      setIsLoading(true);
      const orderResponse = await orderApi.getOrder(orderId);
      const orderData = orderResponse.data;
      setOrder(orderData);

      // Fetch customer details for the business info on invoice
      const customerResponse = await customerApi.getMe();
      setCustomer(customerResponse.data.customer);
      
      // Fetch transaction history
      if (customerResponse.data.customer?.id) {
        fetchTransactions(customerResponse.data.customer.id);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  const fetchTransactions = async (customerId: string) => {
    try {
      setLoadingTransactions(true);
      const response = await fetch(`/api/transactions?customerId=${customerId}`);
      const data = await response.json();
      if (data.transactions) {
        // Sort by date (newest first)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sortedTransactions = data.transactions.sort((a: any, b: any) => 
          new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
        setTransactions(sortedTransactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

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

  const formatOrderId = (orderId: string) => {
    return `#${orderId.slice(-8).toUpperCase()}`;
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
                Order {formatOrderId(order.id)}
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
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    order.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.paymentStatus === 'paid' ? <FiCheckCircle className="w-3 h-3 mr-1" /> :
                     order.paymentStatus === 'partial' ? <FiDollarSign className="w-3 h-3 mr-1" /> :
                     <FiClock className="w-3 h-3 mr-1" />}
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </span>
                </div>
                {(order.totalPaid > 0 || order.remainingAmount > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                    {order.totalPaid > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium text-green-600">€{order.totalPaid.toFixed(2)}</span>
                      </div>
                    )}
                    {order.remainingAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-medium text-red-600">€{order.remainingAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transaction History */}
              {transactions.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FiList className="w-4 h-4" />
                    Your Payment History
                  </h3>
                  {loadingTransactions ? (
                    <p className="text-sm text-gray-500">Loading transactions...</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {transactions.map((transaction) => (
                        <div 
                          key={transaction.id}
                          className="flex items-start justify-between p-2 bg-white rounded border border-gray-200 text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              €{transaction.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.transactionDate).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {transaction.paymentMethod === 'card' ? 'Card' :
                               transaction.paymentMethod === 'cheque' ? 'Cheque' :
                               transaction.paymentMethod === 'credit_note' ? 'Credit Note' : 'Other'}
                            </p>
                            {transaction.reference && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Ref: {transaction.reference}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <FiCheckCircle className="w-3 h-3 mr-1" />
                              Paid
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-700">Total Payments:</span>
                      <span className="text-green-600">
                        €{transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
