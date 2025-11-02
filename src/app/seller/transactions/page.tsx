"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SellerSidebar from '@/components/SellerSidebar';
import SellerSidebarDrawer from '@/components/SellerSidebarDrawer';
import { FiMenu, FiPlus, FiDollarSign, FiFilter, FiX, FiEye, FiUser, FiCheckCircle, FiPackage, FiTrash2 } from 'react-icons/fi';
import { Transaction, CreateTransactionInput } from '@/types/transaction';
import { Customer } from '@/types/customer';
import { Order } from '@/types/cart';
import SellerGuard from '@/components/SellerGuard';

export default function TransactionsPage() {
  return (
    <SellerGuard>
      <TransactionsContent />
    </SellerGuard>
  );
}

// Interface for customer payment overview
interface CustomerPaymentInfo {
  customerId: string;
  customerName: string;
  businessName: string;
  totalOrders: number;
  totalOrderValue: number;
  totalPaid: number;
  totalOutstanding: number;
  orders: Order[];
  lastPaymentDate?: string;
}

// Interface for bulk payment
interface BulkPaymentData {
  customerId: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
  reference?: string;
  notes?: string;
  transactionDate: string;
  orderAllocations: {
    orderId: string;
    amount: number;
  }[];
}

function TransactionsContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerPaymentInfo, setCustomerPaymentInfo] = useState<CustomerPaymentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<CustomerPaymentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Filters
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk payment form state
  const [bulkPaymentData, setBulkPaymentData] = useState<BulkPaymentData>({
    customerId: '',
    customerName: '',
    totalAmount: 0,
    paymentMethod: 'cash',
    reference: '',
    notes: '',
    transactionDate: new Date().toISOString().split('T')[0],
    orderAllocations: []
  });

  // Form state for single transaction
  const [formData, setFormData] = useState<CreateTransactionInput>({
    customerId: '',
    amount: 0,
    paymentMethod: 'cash',
    reference: '',
    notes: '',
    transactionDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [selectedCustomer, selectedPaymentMethod, startDate, endDate, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (customers.length > 0 && orders.length > 0) {
      calculateCustomerPaymentInfo();
    }
  }, [customers, orders, transactions]);

  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [customersResult, ordersResult, transactionsResult] = await Promise.allSettled([
        fetchCustomers(),
        fetchOrders(),
        fetchTransactions()
      ]);

      // Calculate customer payment info after all data is loaded
      setTimeout(() => {
        calculateCustomerPaymentInfo();
      }, 100);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        // API returns { success: true, data: [...], total: number }
        const customersList = data.data || data.customers || [];
        setCustomers(customersList);
        return customersList;
      } else {
        console.error('Failed to fetch customers:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        const ordersData = data.success && data.data ? data.data : [];
        setOrders(ordersData);
        return ordersData;
      } else {
        console.error('Failed to fetch orders:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  };

  const calculateCustomerPaymentInfo = useCallback(() => {
    if (customers.length === 0 || orders.length === 0) {
      return;
    }

    const customerInfo: CustomerPaymentInfo[] = customers.map(customer => {
      // Get all orders for this customer
      const customerOrders = orders.filter(order => 
        order.customerId === customer.id
      );

      const totalOrderValue = customerOrders.reduce((sum, order) => sum + order.total, 0);
      const totalPaid = customerOrders.reduce((sum, order) => sum + (order.totalPaid || 0), 0);
      const totalOutstanding = totalOrderValue - totalPaid;

      // Find last payment date from transactions
      const customerTransactions = transactions.filter(t => t.customerId === customer.id);
      const lastPaymentDate = customerTransactions.length > 0 
        ? customerTransactions.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0].transactionDate
        : undefined;

      return {
        customerId: customer.id,
        customerName: customer.contactPerson || customer.businessName,
        businessName: customer.businessName,
        totalOrders: customerOrders.length,
        totalOrderValue,
        totalPaid,
        totalOutstanding,
        orders: customerOrders,
        lastPaymentDate
      };
    }).filter(info => info.totalOrders > 0); // Only show customers with orders

    // Sort by highest outstanding amount first
    customerInfo.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
    setCustomerPaymentInfo(customerInfo);
  }, [customers, orders, transactions]);

  useEffect(() => {
    calculateCustomerPaymentInfo();
  }, [calculateCustomerPaymentInfo]);

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCustomer) params.append('customerId', selectedCustomer);
      if (selectedPaymentMethod) params.append('paymentMethod', selectedPaymentMethod);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        return data.transactions || [];
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch transactions:', errorData.error || 'Unknown error');
        
        if (response.status === 403) {
          alert('Access denied. Please logout and login again to refresh your session.');
        }
        return [];
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }, [selectedCustomer, selectedPaymentMethod, startDate, endDate]);

  const openBulkPaymentModal = (customerInfo: CustomerPaymentInfo) => {
    setSelectedCustomerForPayment(customerInfo);
    setBulkPaymentData({
      customerId: customerInfo.customerId,
      customerName: customerInfo.customerName,
      totalAmount: 0,
      paymentMethod: 'cash',
      reference: '',
      notes: '',
      transactionDate: new Date().toISOString().split('T')[0],
      orderAllocations: customerInfo.orders
        .filter(order => {
          const outstanding = order.remainingAmount || (order.total - (order.totalPaid || 0));
          return outstanding > 0;
        })
        .map(order => ({
          orderId: order.id,
          amount: 0
        }))
    });
    setShowBulkPaymentModal(true);
  };

  const handleBulkPaymentAmountChange = (orderId: string, amount: number) => {
    setBulkPaymentData(prev => ({
      ...prev,
      orderAllocations: prev.orderAllocations.map(allocation =>
        allocation.orderId === orderId 
          ? { ...allocation, amount: Math.max(0, amount) }
          : allocation
      )
    }));
  };

  const calculateTotalAllocated = () => {
    return bulkPaymentData.orderAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  };

  const handleAutoAllocatePayment = () => {
    if (!selectedCustomerForPayment || bulkPaymentData.totalAmount <= 0) return;

    let remainingAmount = bulkPaymentData.totalAmount;
    const newAllocations = [...bulkPaymentData.orderAllocations];

    // Sort orders by date (oldest first) and allocate payment
    const outstandingOrders = selectedCustomerForPayment.orders
      .filter(order => {
        const outstanding = order.remainingAmount || (order.total - (order.totalPaid || 0));
        return outstanding > 0;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    newAllocations.forEach(allocation => {
      const order = outstandingOrders.find(o => o.id === allocation.orderId);
      if (order && remainingAmount > 0) {
        const orderOutstanding = order.remainingAmount || (order.total - (order.totalPaid || 0));
        const amountToAllocate = Math.min(remainingAmount, orderOutstanding);
        allocation.amount = amountToAllocate;
        remainingAmount -= amountToAllocate;
      } else {
        allocation.amount = 0;
      }
    });

    setBulkPaymentData(prev => ({
      ...prev,
      orderAllocations: newAllocations
    }));
  };

  const handleSubmitBulkPayment = async () => {
    if (!selectedCustomerForPayment || bulkPaymentData.totalAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    const totalAllocated = calculateTotalAllocated();
    if (totalAllocated !== bulkPaymentData.totalAmount) {
      alert(`Total allocated (€${totalAllocated.toFixed(2)}) must equal payment amount (€${bulkPaymentData.totalAmount.toFixed(2)})`);
      return;
    }

    try {
      setIsAddingTransaction(true);

      // First, record the transaction
      const transactionResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: bulkPaymentData.customerId,
          amount: bulkPaymentData.totalAmount,
          paymentMethod: bulkPaymentData.paymentMethod,
          reference: bulkPaymentData.reference,
          notes: `Bulk payment allocated across ${bulkPaymentData.orderAllocations.filter(a => a.amount > 0).length} orders. ${bulkPaymentData.notes || ''}`,
          transactionDate: bulkPaymentData.transactionDate
        }),
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json();
        throw new Error(errorData.error || 'Failed to record transaction');
      }

      // Then update each order with allocated payments
      const orderUpdatePromises = bulkPaymentData.orderAllocations
        .filter(allocation => allocation.amount > 0)
        .map(allocation => 
          fetch(`/api/orders/${allocation.orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentAmount: allocation.amount,
              paymentMethod: bulkPaymentData.paymentMethod,
              paymentNotes: `Part of bulk payment (€${bulkPaymentData.totalAmount}) - ${bulkPaymentData.reference || 'No reference'}`
            }),
          })
        );

      await Promise.all(orderUpdatePromises);

      alert(`Bulk payment of €${bulkPaymentData.totalAmount.toFixed(2)} recorded successfully!`);
      setShowBulkPaymentModal(false);
      setSelectedCustomerForPayment(null);
      
      // Reset form
      setBulkPaymentData({
        customerId: '',
        customerName: '',
        totalAmount: 0,
        paymentMethod: 'cash',
        reference: '',
        notes: '',
        transactionDate: new Date().toISOString().split('T')[0],
        orderAllocations: []
      });

      // Refresh data
      await fetchInitialData();
    } catch (error) {
      console.error('Error processing bulk payment:', error);
      alert(`Failed to process bulk payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingTransaction(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || formData.amount <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsAddingTransaction(true);
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Transaction recorded successfully!');
        setShowAddForm(false);
        // Reset form
        setFormData({
          customerId: '',
          amount: 0,
          paymentMethod: 'cash',
          reference: '',
          notes: '',
          transactionDate: new Date().toISOString().split('T')[0]
        });
        await fetchInitialData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to record transaction');
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to record transaction');
    } finally {
      setIsAddingTransaction(false);
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      setDeletingTransactionId(transactionToDelete.id);
      const response = await fetch(`/api/transactions/${transactionToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Transaction deleted successfully!');
        setShowDeleteConfirm(false);
        setTransactionToDelete(null);
        // Refresh data
        await fetchInitialData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    } finally {
      setDeletingTransactionId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setTransactionToDelete(null);
  };

  const clearFilters = () => {
    setSelectedCustomer('');
    setSelectedPaymentMethod('');
    setStartDate('');
    setEndDate('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatOrderId = (orderId: string) => {
    return `#${orderId.slice(-8).toUpperCase()}`;
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalOutstanding = customerPaymentInfo.reduce((sum, info) => sum + info.totalOutstanding, 0);
  const totalCustomersWithOutstanding = customerPaymentInfo.filter(info => info.totalOutstanding > 0).length;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <SellerSidebar />
      </div>

      {/* Mobile Sidebar Drawer */}
      <SellerSidebarDrawer open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <FiMenu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
                <p className="text-sm text-gray-600">Manage customer payments and outstanding balances</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (customers.length === 0) {
                    alert('Please wait for customers to load before recording a transaction.');
                    return;
                  }
                  setShowAddForm(true);
                }}
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus className="w-5 h-5" />
                <span className="hidden sm:inline">{isLoading ? 'Loading...' : 'Record Transaction'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiUser className="inline mr-2" />
                  Customer Overview
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'transactions'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiDollarSign className="inline mr-2" />
                  Transaction History
                </button>
              </nav>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-3 rounded-lg">
                  <FiDollarSign className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <FiCheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Received</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <FiUser className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customers with Debt</p>
                  <p className="text-2xl font-bold text-orange-700">{totalCustomersWithOutstanding}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FiPackage className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-700">{transactions.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' ? (
            /* Customer Overview Tab */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Customer Payment Overview</h3>
                <p className="text-sm text-gray-600 mt-1">Click &quot;Record Payment&quot; to process bulk payments across multiple orders</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Orders</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Value</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Outstanding</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Payment</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          Loading customer payment information...
                        </td>
                      </tr>
                    ) : customerPaymentInfo.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No customer payment data found.
                        </td>
                      </tr>
                    ) : (
                      customerPaymentInfo.map((customerInfo) => (
                        <tr key={customerInfo.customerId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {customerInfo.businessName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {customerInfo.customerName}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {customerInfo.totalOrders}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {formatCurrency(customerInfo.totalOrderValue)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                            {formatCurrency(customerInfo.totalPaid)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            <span className={`${customerInfo.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(customerInfo.totalOutstanding)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {customerInfo.lastPaymentDate ? formatDate(customerInfo.lastPaymentDate) : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-2">
                              {customerInfo.totalOutstanding > 0 && (
                                <button
                                  onClick={() => openBulkPaymentModal(customerInfo)}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                                >
                                  Record Payment
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  // Navigate to customer details or orders
                                  console.log('View customer orders:', customerInfo.customerId);
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                              >
                                <FiEye className="inline" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Transaction History Tab */
            <>
              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FiFilter className="w-5 h-5" />
                    Filters
                  </h3>
                  {(selectedCustomer || selectedPaymentMethod || startDate || endDate) && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <FiX className="w-4 h-4" />
                      Clear Filters
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">All Customers</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.businessName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">All Methods</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Payment Method</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reference</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            Loading transactions...
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            No transactions found. Record your first payment to get started.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(transaction.transactionDate)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {transaction.customerName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                {transaction.paymentMethod.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {transaction.reference || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                              {formatCurrency(transaction.amount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {transaction.notes || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDeleteClick(transaction)}
                                disabled={deletingTransactionId === transaction.id}
                                className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete transaction"
                              >
                                {deletingTransactionId === transaction.id ? (
                                  <span className="inline-block animate-spin">⏳</span>
                                ) : (
                                  <FiTrash2 className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Bulk Payment Modal */}
      {showBulkPaymentModal && selectedCustomerForPayment && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowBulkPaymentModal(false);
            setSelectedCustomerForPayment(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Bulk Payment - {selectedCustomerForPayment.businessName}
                </h2>
                <button
                  onClick={() => {
                    setShowBulkPaymentModal(false);
                    setSelectedCustomerForPayment(null);
                  }}
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Outstanding: {formatCurrency(selectedCustomerForPayment.totalOutstanding)} across {selectedCustomerForPayment.orders.filter(o => (o.remainingAmount || o.total) > 0).length} orders
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCustomerForPayment.totalOutstanding}
                    value={bulkPaymentData.totalAmount || ''}
                    onChange={(e) => setBulkPaymentData({ 
                      ...bulkPaymentData, 
                      totalAmount: parseFloat(e.target.value) || 0 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bulkPaymentData.paymentMethod}
                    onChange={(e) => setBulkPaymentData({ 
                      ...bulkPaymentData, 
                      paymentMethod: e.target.value as 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference / Cheque No.
                  </label>
                  <input
                    type="text"
                    value={bulkPaymentData.reference}
                    onChange={(e) => setBulkPaymentData({ 
                      ...bulkPaymentData, 
                      reference: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bulkPaymentData.transactionDate}
                    onChange={(e) => setBulkPaymentData({ 
                      ...bulkPaymentData, 
                      transactionDate: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={bulkPaymentData.notes}
                  onChange={(e) => setBulkPaymentData({ 
                    ...bulkPaymentData, 
                    notes: e.target.value 
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Any additional notes about this payment..."
                />
              </div>

              {/* Payment Allocation */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Allocation</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      Allocated: {formatCurrency(calculateTotalAllocated())} / {formatCurrency(bulkPaymentData.totalAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoAllocatePayment}
                      disabled={bulkPaymentData.totalAmount <= 0}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Auto Allocate
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedCustomerForPayment.orders
                    .filter(order => (order.remainingAmount || order.total - (order.totalPaid || 0)) > 0)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((order) => {
                      const allocation = bulkPaymentData.orderAllocations.find(a => a.orderId === order.id);
                      const outstanding = order.remainingAmount || (order.total - (order.totalPaid || 0));
                      
                      return (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                {formatOrderId(order.id)}
                              </span>
                              <div className="text-right">
                                <span className="text-sm text-gray-600">
                                  {formatDate(order.createdAt)}
                                </span>
                                <div className="text-xs text-blue-600">
                                  Status: {order.status}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              Total: {formatCurrency(order.total)} | Paid: {formatCurrency(order.totalPaid || 0)} | Outstanding: {formatCurrency(outstanding)}
                            </div>
                          </div>
                          <div className="ml-4 w-32">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={outstanding}
                              value={allocation?.amount || ''}
                              onChange={(e) => handleBulkPaymentAmountChange(
                                order.id, 
                                parseFloat(e.target.value) || 0
                              )}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkPaymentModal(false);
                    setSelectedCustomerForPayment(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitBulkPayment}
                  disabled={isAddingTransaction || bulkPaymentData.totalAmount <= 0 || calculateTotalAllocated() !== bulkPaymentData.totalAmount}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingTransaction ? 'Processing...' : `Record Payment (${formatCurrency(bulkPaymentData.totalAmount)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Transaction Modal */}
      {showAddForm && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddForm(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Record Single Transaction</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                For bulk payments across multiple orders, use the Customer Overview tab
              </p>
            </div>

            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                {customers.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                    Loading customers... If this persists, please refresh the page.
                  </div>
                ) : (
                  <>
                    <select
                      value={formData.customerId}
                      onChange={(e) => {
                        setFormData({ ...formData, customerId: e.target.value });
                      }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select customer</option>
                      
                      {/* Customers with outstanding balance - Priority */}
                      {(() => {
                        const customersWithBalance = customerPaymentInfo.filter(info => info.totalOutstanding > 0);
                        const customersWithOrders = customerPaymentInfo.filter(info => info.totalOutstanding === 0 && info.totalOrders > 0);
                        const customersWithoutOrders = customers.filter(c => 
                          !customerPaymentInfo.find(info => info.customerId === c.id)
                        );
                        
                        return (
                          <>
                            {customersWithBalance.length > 0 && (
                              <optgroup label={`🔴 Customers with Outstanding Balance (${customersWithBalance.length})`}>
                                {customersWithBalance.map((info) => (
                                  <option key={info.customerId} value={info.customerId}>
                                    {info.businessName} - Outstanding: {formatCurrency(info.totalOutstanding)}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            
                            {customersWithOrders.length > 0 && (
                              <optgroup label={`✅ Customers with Paid Orders (${customersWithOrders.length})`}>
                                {customersWithOrders.map((info) => (
                                  <option key={info.customerId} value={info.customerId}>
                                    {info.businessName} - All Paid ({info.totalOrders} orders)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            
                            {customersWithoutOrders.length > 0 && (
                              <optgroup label={`⚪ Customers without Orders (${customersWithoutOrders.length})`}>
                                {customersWithoutOrders.map((customer) => (
                                  <option key={customer.id} value={customer.id}>
                                    {customer.businessName} - No orders yet
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        );
                      })()}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      💡 Tip: Customers with outstanding balances are shown first
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other' })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference / Cheque No.
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Any additional notes about this payment..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingTransaction}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingTransaction ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && transactionToDelete && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleDeleteCancel}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <FiTrash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Transaction</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-gray-900">{transactionToDelete.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(transactionToDelete.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span className="text-gray-900">{formatDate(transactionToDelete.transactionDate)}</span>
                </div>
                {transactionToDelete.reference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reference:</span>
                    <span className="text-gray-900">{transactionToDelete.reference}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteCancel}
                  disabled={deletingTransactionId !== null}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deletingTransactionId !== null}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingTransactionId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
