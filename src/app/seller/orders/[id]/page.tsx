"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SellerSidebar from '@/components/SellerSidebar';
import SellerSidebarDrawer from '@/components/SellerSidebarDrawer';
import SellerGuard from '@/components/SellerGuard';
import { useAuth } from '@/components/AuthProvider';
import { orderApi, customerApi } from '@/lib/api-client';
import { Order, OrderItem } from '@/types/cart';
import { Customer } from '@/types/customer';
import { Transaction } from '@/types/transaction';
import Invoice from '@/components/Invoice';
import DeliveryNote from '@/components/DeliveryNote';
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiSave, 
  FiX, 
  FiPackage, 
  FiUser, 
  FiMapPin, 
  FiCreditCard, 
  FiFileText, 
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiXCircle,
  FiAlertTriangle,
  FiTrash2,
  FiDollarSign,
  FiList
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

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  const { userData } = useAuth();
  const canManagePayments = userData?.role === 'admin';
  const canViewInvoices = userData?.role === 'admin';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [editedDeliveryFee, setEditedDeliveryFee] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Payment recording state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'credit' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Credit note state
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [creditNoteAmount, setCreditNoteAmount] = useState('');
  const [creditNoteReason, setCreditNoteReason] = useState<'returned_goods' | 'quality_issue' | 'wrong_items' | 'damaged_goods' | 'pricing_error' | 'customer_complaint' | 'other'>('returned_goods');
  const [creditNoteNotes, setCreditNoteNotes] = useState('');
  const [isProcessingCreditNote, setIsProcessingCreditNote] = useState(false);
  
  // Transaction history state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Document visibility state
  const [showDeliveryNoteModal, setShowDeliveryNoteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchOrderData = useCallback(async () => {
    try {
      setIsLoading(true);
      const orderResponse = await orderApi.getOrder(orderId);
      const orderData = orderResponse.data;
      setOrder(orderData);
      setEditedItems([...orderData.items]);
      setEditedDeliveryFee(orderData.deliveryFee);

      // Fetch customer data
      const customerResponse = await customerApi.getCustomer(orderData.customerId);
      setCustomer(customerResponse.data);
      
      // Fetch transaction history for this customer to show payment history
      fetchTransactions(orderData.customerId);
    } catch (error) {
      console.error('Error fetching order:', error);
      showToastMessage('Error loading order data');
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
    if (orderId) {
      fetchOrderData();
    }
  }, [orderId, fetchOrderData]);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleEditMode = () => {
    setIsEditing(true);
    setEditedItems([...order!.items]);
    setEditedDeliveryFee(order!.deliveryFee);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedItems([...order!.items]);
    setEditedDeliveryFee(order!.deliveryFee);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setEditedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setEditedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateNewTotals = () => {
    const subtotal = editedItems.reduce((sum, item) => sum + item.total, 0);
    const deliveryFee = editedDeliveryFee;
    const total = subtotal + deliveryFee;
    
    return { subtotal, deliveryFee, total };
  };

  const handleSaveChanges = async () => {
    if (!order) return;

    try {
      setIsSaving(true);
      const { subtotal, total } = calculateNewTotals();

      const updateData = {
        items: editedItems,
        subtotal,
        deliveryFee: editedDeliveryFee,
        total
      };

      await orderApi.updateOrder(order.id, updateData);
      
      // Refresh order data
      await fetchOrderData();
      setIsEditing(false);
      showToastMessage('Order updated successfully');
    } catch (error) {
      console.error('Error updating order:', error);
      showToastMessage('Error updating order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: Order['status']) => {
    if (!order) return;

    try {
      await orderApi.updateOrder(order.id, { status: newStatus });
      await fetchOrderData();
      showToastMessage(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      showToastMessage('Error updating order status');
    }
  };

  const handleRecordPayment = async () => {
    if (!canManagePayments) {
      return;
    }
    if (!order || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      showToastMessage('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const remainingAmount = order.remainingAmount || order.total;

    if (amount > remainingAmount) {
      showToastMessage(`Payment amount cannot exceed remaining balance of €${remainingAmount.toFixed(2)}`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      await orderApi.updateOrder(order.id, {
        paymentAmount: amount,
        paymentMethod,
        paymentNotes
      });

      showToastMessage(`Payment of €${amount.toFixed(2)} recorded successfully`);
      
      // Reset form and close modal
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentMethod('cash');
      
      await fetchOrderData();
    } catch (error) {
      console.error('Error recording payment:', error);
      showToastMessage('Error recording payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openPaymentModal = () => {
    if (!canManagePayments) {
      return;
    }
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentMethod('cash');
    setShowPaymentModal(true);
  };

  const openCreditNoteModal = () => {
    if (!canManagePayments) {
      return;
    }
    setCreditNoteAmount('');
    setCreditNoteNotes('');
    setCreditNoteReason('returned_goods');
    setShowCreditNoteModal(true);
  };

  const handleIssueCreditNote = async () => {
    if (!canManagePayments) {
      return;
    }
    if (!order || !creditNoteAmount || parseFloat(creditNoteAmount) <= 0) {
      showToastMessage('Please enter a valid credit note amount');
      return;
    }

    const amount = parseFloat(creditNoteAmount);

    if (amount > order.total) {
      showToastMessage(`Credit note amount cannot exceed order total of €${order.total.toFixed(2)}`);
      return;
    }

    setIsProcessingCreditNote(true);
    try {
      const response = await orderApi.updateOrder(order.id, {
        creditNoteAmount: amount,
        creditNoteReason,
        creditNoteNotes
      });

      showToastMessage(response.message || `Credit note of €${amount.toFixed(2)} issued successfully`);
      
      // Reset form and close modal
      setShowCreditNoteModal(false);
      setCreditNoteAmount('');
      setCreditNoteNotes('');
      setCreditNoteReason('returned_goods');
      
      await fetchOrderData();
    } catch (error) {
      console.error('Error issuing credit note:', error);
      showToastMessage('Error issuing credit note');
    } finally {
      setIsProcessingCreditNote(false);
    }
  };

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

  const generateDeliveryNoteNumber = (order: Order) => {
    const date = new Date(order.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const orderSuffix = order.id.slice(-6).toUpperCase();
    return `DN-${year}${month}-${orderSuffix}`;
  };

  const Toast = () => {
    if (!showToast) return null;
    
    return (
      <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg animate-fade-in">
        <div className="flex items-center gap-2">
          <FiCheckCircle className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <SellerGuard allowedRoles={['seller', 'admin']}>
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
          <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
            <SellerSidebar />
          </div>
          <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
            <div className="w-full max-w-6xl mx-auto px-4 py-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SellerGuard>
    );
  }

  if (!order) {
    return (
      <SellerGuard allowedRoles={['seller', 'admin']}>
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
          <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
            <SellerSidebar />
          </div>
          <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
            <div className="w-full max-w-6xl mx-auto px-4 py-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
                <p className="text-gray-600 mb-6">The order you&apos;re looking for doesn&apos;t exist.</p>
                <button
                  onClick={() => router.push('/seller/orders')}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Back to Orders
                </button>
              </div>
            </div>
          </main>
        </div>
      </SellerGuard>
    );
  }

  const { subtotal: newSubtotal, total: newTotal } = calculateNewTotals();
  const hasChanges = JSON.stringify(editedItems) !== JSON.stringify(order.items) || editedDeliveryFee !== order.deliveryFee;

  return (
    <SellerGuard allowedRoles={['seller', 'admin']}>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        <Toast />

        {/* Sidebar */}
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

        <SellerSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
          <div className="w-full max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/seller/orders')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Order {formatOrderId(order.id)}
                  </h1>
                  <p className="text-gray-600">Created {formatDate(order.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Badge */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold gap-2 ${statusConfig[order.status].color}`}>
                  {statusConfig[order.status].icon}
                  {statusConfig[order.status].label}
                </span>

                {/* Edit Button */}
                {!isEditing && order.status === 'pending' && (
                  <button
                    onClick={handleEditMode}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    Edit Order
                  </button>
                )}

                {/* Edit Actions */}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <FiX className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={!hasChanges || isSaving}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiSave className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Information */}
                {customer && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FiUser className="text-blue-600" />
                      Customer Information
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
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-gray-900">{customer.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-gray-900">{customer.phone || 'Not provided'}</p>
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
                      {isEditing && (
                        <span className="ml-2 text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Editing Mode
                        </span>
                      )}
                    </h2>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {(isEditing ? editedItems : order.items).map((item) => (
                      <div key={item.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-gray-600">€{item.price.toFixed(2)} per {item.unit}</span>
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-gray-600">Qty:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                    title="Remove item"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-600">Quantity: {item.quantity}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">€{item.total.toFixed(2)}</p>
                            {isEditing && item.quantity === 0 && (
                              <p className="text-sm text-red-600">Item will be removed</p>
                            )}
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

                {/* Payment History */}
                {order.payments && order.payments.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FiDollarSign className="text-green-600" />
                      Payment History
                    </h2>
                    <div className="space-y-3">
                      {order.payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">€{payment.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(payment.date)} • {payment.method.replace('_', ' ')}
                            </p>
                            {payment.notes && (
                              <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>
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
                  </div>
                )}

                {/* Documents are now shown in modals via action buttons */}
              </div>

              {/* Order Summary & Actions */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium text-gray-900">
                        €{(isEditing ? newSubtotal : order.subtotal).toFixed(2)}
                      </span>
                    </div>
                    
                    {isEditing ? (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Delivery Fee</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">€</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editedDeliveryFee}
                            onChange={(e) => setEditedDeliveryFee(parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    ) : (
                      order.deliveryFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery Fee</span>
                          <span className="font-medium text-gray-900">
                            €{order.deliveryFee.toFixed(2)}
                          </span>
                        </div>
                      )
                    )}
                    
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between">
                        <span className="text-xl font-semibold text-gray-900">Total</span>
                        <span className="text-xl font-bold text-red-600">
                          €{(isEditing ? newTotal : order.total).toFixed(2)}
                        </span>
                      </div>
                      {isEditing && hasChanges && (
                        <p className="text-sm text-blue-600 mt-2">
                          Original: €{order.total.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Payment Summary */}
                    {!isEditing && (order.totalPaid > 0 || order.paymentStatus !== 'pending') && (
                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Paid</span>
                          <span className="font-medium text-green-600">
                            €{(order.totalPaid || 0).toFixed(2)}
                          </span>
                        </div>
                        {order.remainingAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Remaining</span>
                            <span className="font-medium text-red-600">
                              €{order.remainingAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Credit Notes Summary */}
                    {!isEditing && order.creditNotes && order.creditNotes.length > 0 && (
                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Credit Notes Applied</span>
                          <span className="font-medium text-orange-600">
                            -€{(order.totalCreditNotes || 0).toFixed(2)}
                          </span>
                        </div>
                        {order.originalTotal && (
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Original Total:</span>
                            <span>€{order.originalTotal.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Info */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FiCreditCard className="w-4 h-4" />
                      Payment Information
                    </h3>
                    <p className="text-gray-700">
                      Method: {order.paymentMethod === 'credit' ? 'Credit Account' : 'Cash on Delivery'}
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
                    {order.payments && order.payments.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {order.payments.length} payment{order.payments.length > 1 ? 's' : ''} recorded
                      </p>
                    )}
                  </div>

                  {/* Transaction History */}
                  {transactions.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <FiList className="w-4 h-4" />
                        Transaction History
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
                          <span className="text-gray-700">Total from Transactions:</span>
                          <span className="text-green-600">
                            €{transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Credit Notes History */}
                  {order.creditNotes && order.creditNotes.length > 0 && (
                    <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <FiFileText className="w-4 h-4" />
                        Credit Notes Issued
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {order.creditNotes.map((creditNote) => (
                          <div 
                            key={creditNote.id}
                            className="flex items-start justify-between p-3 bg-white rounded border border-orange-200"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">
                                -€{creditNote.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(creditNote.date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-xs text-gray-600 mt-1 capitalize">
                                {creditNote.reason.replace(/_/g, ' ')}
                              </p>
                              {creditNote.notes && (
                                <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                                  {creditNote.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                <FiX className="w-3 h-3 mr-1" />
                                Credit
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-gray-700">Total Credit Notes:</span>
                          <span className="text-orange-600">
                            -€{order.creditNotes.reduce((sum, cn) => sum + cn.amount, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Actions */}
                  {!isEditing && (
                    <div className="space-y-3">
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange('confirmed')}
                            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                          >
                            Confirm Order
                          </button>
                          <button
                            onClick={() => handleStatusChange('cancelled')}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Cancel Order
                          </button>
                        </>
                      )}
                      
                      {order.status === 'confirmed' && (
                        <>
                          {canManagePayments && (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') && (
                            <button
                              onClick={openPaymentModal}
                              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                            >
                              Record Payment
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange('prepared')}
                            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                          >
                            Mark as Prepared
                          </button>
                        </>
                      )}
                      
                      {order.status === 'prepared' && (
                        <>
                          {canManagePayments && (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') && (
                            <button
                              onClick={openPaymentModal}
                              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                            >
                              Record Payment
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange('delivered')}
                            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                          >
                            Mark as Delivered
                          </button>
                        </>
                      )}

                      {canManagePayments && order.status === 'delivered' && (order.paymentStatus === 'pending' || order.paymentStatus === 'partial') && (
                        <button
                          onClick={openPaymentModal}
                          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                        >
                          Record Payment
                        </button>
                      )}

                      {/* Issue Credit Note button - Available for all statuses except cancelled */}
                      {canManagePayments && order.status !== 'cancelled' && order.total > 0 && (
                        <button
                          onClick={openCreditNoteModal}
                          className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                        >
                          Issue Credit Note
                        </button>
                      )}
                      
                      {/* Document Actions - Show based on order status */}
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                        {(order.status === 'prepared' || order.status === 'delivered') && (
                          <button
                            onClick={() => setShowDeliveryNoteModal(true)}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                          >
                            <FiTruck className="w-4 h-4" />
                            Delivery Note
                          </button>
                        )}
                        
                        {canViewInvoices && (order.status === 'confirmed' || order.status === 'prepared' || order.status === 'delivered') && (
                          <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
                          >
                            <FiFileText className="w-4 h-4" />
                            Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Change Summary for Editing */}
                  {isEditing && hasChanges && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h3 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <FiAlertTriangle className="w-4 h-4" />
                        Changes Summary
                      </h3>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <p>Items changed: {editedItems.filter((item, index) => 
                          JSON.stringify(item) !== JSON.stringify(order.items[index])
                        ).length}</p>
                        <p>Total difference: €{(newTotal - order.total).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Payment Modal */}
        {canManagePayments && showPaymentModal && order && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Record Payment
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order Total:</span>
                    <span className="font-medium">€{order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Already Paid:</span>
                    <span className="font-medium text-green-600">€{(order.totalPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 mt-2">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-bold text-red-600">€{(order.remainingAmount || order.total).toFixed(2)}</span>
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
                    max={order.remainingAmount || order.total}
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
                  onClick={() => setShowPaymentModal(false)}
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

        {/* Credit Note Modal */}
        {canManagePayments && showCreditNoteModal && order && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Issue Credit Note
                </h3>
                <button
                  onClick={() => setShowCreditNoteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Order Total:</span>
                    <span className="font-medium">€{order.total.toFixed(2)}</span>
                  </div>
                  {order.originalTotal && order.originalTotal !== order.total && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Original Total:</span>
                      <span className="font-medium">€{order.originalTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {order.totalCreditNotes && order.totalCreditNotes > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Credit Notes:</span>
                      <span className="font-medium text-orange-600">-€{order.totalCreditNotes.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-700">
                    <strong>Note:</strong> Issuing a credit note will reduce the order total and remaining amount due. This is typically done for returned goods, quality issues, or customer complaints.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Credit Amount (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={order.total}
                    value={creditNoteAmount}
                    onChange={(e) => setCreditNoteAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={creditNoteReason}
                    onChange={(e) => setCreditNoteReason(e.target.value as typeof creditNoteReason)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="returned_goods">Returned Goods</option>
                    <option value="quality_issue">Quality Issue</option>
                    <option value="wrong_items">Wrong Items Delivered</option>
                    <option value="damaged_goods">Damaged Goods</option>
                    <option value="pricing_error">Pricing Error</option>
                    <option value="customer_complaint">Customer Complaint</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={creditNoteNotes}
                    onChange={(e) => setCreditNoteNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Describe the reason for this credit note (e.g., '5kg chicken breast returned - did not meet quality specifications')"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide detailed information about why this credit note is being issued
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreditNoteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIssueCreditNote}
                  disabled={isProcessingCreditNote || !creditNoteAmount || parseFloat(creditNoteAmount) <= 0 || !creditNoteNotes}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingCreditNote ? 'Issuing...' : 'Issue Credit Note'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Note Modal */}
        {showDeliveryNoteModal && order && customer && (
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full my-8 shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delivery Note
                </h3>
                <button
                  onClick={() => setShowDeliveryNoteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto">
                <DeliveryNote 
                  order={order}
                  customer={customer}
                  deliveryNoteNumber={generateDeliveryNoteNumber(order)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {canViewInvoices && showInvoiceModal && order && customer && (
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full my-8 shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Invoice
                </h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto">
                <Invoice 
                  order={order}
                  customer={customer}
                  invoiceNumber={generateInvoiceNumber(order)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </SellerGuard>
  );
}
