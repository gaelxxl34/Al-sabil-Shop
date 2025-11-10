"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  FiCalendar, 
  FiDollarSign, 
  FiUsers, 
  FiAlertCircle,  
  FiCheckCircle,
  FiFileText,
  FiLoader,
  FiArrowLeft,
  FiDownload
} from "react-icons/fi";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import SellerHeader from "@/components/SellerHeader";
import SellerGuard from "@/components/SellerGuard";
import { useAuth } from "@/components/AuthProvider";
import SkeletonComponents from "@/components/SkeletonLoader";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface ReportData {
  totalRevenue: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  totalOrders: number;
  paidOrders: number;
  partialOrders: number;
  unpaidOrders: number;
  totalCustomers: number;
  activeCustomers: number;
  averageOrderValue: number;
  deliveryRevenue: number;
  productRevenue: number;
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>;
  topCustomers: Array<{ 
    name: string; 
    totalSpent: number; 
    totalPaid: number;
    totalOutstanding: number;
    orderCount: number; 
    status: string 
  }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  paymentStatus: Array<{ name: string; value: number; percentage: number }>;
}

interface CustomerPaymentStatus {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  paidOrders: number;
  partialOrders: number;
  unpaidOrders: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  lastOrderDate: string;
  status: 'good' | 'warning' | 'overdue';
}

interface CustomerInvoiceDetail {
  orderId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: string;
  orderStatus: string;
}

// Color mapping for payment status: green for paid, red for unpaid
const getPaymentStatusColor = (name: string) => {
  switch (name.toLowerCase()) {
    case 'paid':
      return '#10b981'; // Green
    case 'unpaid':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray fallback
  }
};

function ReportsPageContent() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'annually' | 'custom'>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [customerPayments, setCustomerPayments] = useState<CustomerPaymentStatus[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Individual Customer Report States
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPaymentStatus | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoiceDetail[]>([]);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);

  const loadReportData = useCallback(async () => {
    if (!user?.uid) {
      console.error('No authenticated user found');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Build query parameters
      let queryParams = `period=${reportPeriod}&sellerId=${user.uid}`;
      
      if (reportPeriod === 'custom') {
        // Use custom date range
        if (!customStartDate || !customEndDate) {
          console.error('Custom date range requires both start and end dates');
          setIsLoading(false);
          return;
        }
        queryParams += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      } else {
        // Use selected date for predefined periods
        queryParams += `&date=${selectedDate}`;
      }
      
      // Use the reports API with authenticated user ID
      const reportsResponse = await fetch(`/api/reports?${queryParams}`);
      const reportsData = await reportsResponse.json();

      if (reportsData.success) {
        const data = reportsData.data;
        
        // Transform API data to match component expectations
        const processedData: ReportData = {
          totalRevenue: data.summary.totalRevenue,
          totalPaidAmount: data.summary.totalPaidAmount,
          totalOutstanding: data.summary.totalOutstanding,
          totalOrders: data.summary.totalOrders,
          paidOrders: data.summary.paidOrders,
          partialOrders: data.summary.partialOrders,
          unpaidOrders: data.summary.unpaidOrders,
          totalCustomers: data.summary.totalCustomers,
          activeCustomers: data.summary.activeCustomers,
          averageOrderValue: data.summary.averageOrderValue,
          deliveryRevenue: data.summary.deliveryRevenue,
          productRevenue: data.summary.productRevenue,
          dailyRevenue: data.trends,
          topCustomers: data.topCustomers,
          topProducts: data.topProducts,
          paymentStatus: data.paymentAnalysis,
        };
        
        setReportData(processedData);
        
        // Process customer payment status
        const paymentStatus = data.topCustomers.map((customer: { 
          id: string;
          name: string;
          email: string;
          orderCount: number;
          paidOrders: number;
          partialOrders: number;
          unpaidOrders: number;
          totalSpent: number;
          totalPaid: number;
          totalOutstanding: number;
        }) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          totalOrders: customer.orderCount,
          paidOrders: customer.paidOrders,
          partialOrders: customer.partialOrders,
          unpaidOrders: customer.unpaidOrders,
          totalAmount: customer.totalSpent,
          paidAmount: customer.totalPaid,
          unpaidAmount: customer.totalOutstanding,
          lastOrderDate: new Date().toISOString(), // You might want to add this to the API
          status: customer.totalOutstanding === 0 ? 'good' as const : 
                  customer.totalOutstanding <= customer.totalSpent * 0.3 ? 'warning' as const : 'overdue' as const,
        }));
        
        setCustomerPayments(paymentStatus);
      } else {
        console.error('Failed to fetch report data:', reportsData.error);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reportPeriod, selectedDate, customStartDate, customEndDate, user?.uid]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const loadCustomerInvoiceDetails = async (customer: CustomerPaymentStatus) => {
    setLoadingCustomerDetails(true);
    setSelectedCustomer(customer);
    
    try {
      // Fetch all orders for this customer
      const ordersResponse = await fetch(`/api/orders?customerId=${customer.id}&sellerId=${user?.uid}`);
      const ordersData = await ordersResponse.json();
      
      // Fetch all transactions for this customer to get accurate payment data
      // This ensures the report shows the same payment data as the transactions page
      await fetch(`/api/transactions?customerId=${customer.id}`);
      
      // Transactions are available but not used in this calculation
      // Payment tracking is handled separately in the transactions page
      
      if (ordersData.success && ordersData.data) {
        // Transform orders into invoice details
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoices: CustomerInvoiceDetail[] = ordersData.data.map((order: any) => {
          const invoiceDate = new Date(order.createdAt);
          const dueDate = new Date(invoiceDate);
          dueDate.setDate(dueDate.getDate() + 30);
          
          const generateInvoiceNumber = (orderId: string, createdAt: string) => {
            const date = new Date(createdAt);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const orderSuffix = orderId.slice(-6).toUpperCase();
            return `INV-${year}${month}-${orderSuffix}`;
          };
          
          const totalAmount = order.total || (order.subtotal + order.deliveryFee);
          
          // Use order.totalPaid if available, otherwise use order.paidAmount for backward compatibility
          const orderPaidAmount = order.totalPaid || order.paidAmount || 0;
          
          const outstandingAmount = totalAmount - orderPaidAmount;
          
          return {
            orderId: order.id,
            invoiceNumber: generateInvoiceNumber(order.id, order.createdAt),
            invoiceDate: order.createdAt,
            dueDate: dueDate.toISOString(),
            totalAmount,
            paidAmount: orderPaidAmount,
            outstandingAmount,
            paymentStatus: order.paymentStatus as 'paid' | 'partial' | 'unpaid',
            paymentMethod: order.paymentMethod === 'credit' ? 'Credit Account' : 'Cash on Delivery',
            orderStatus: order.status
          };
        });
        
        // Sort by date (newest first)
        invoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        
        setCustomerInvoices(invoices);
      }
    } catch (error) {
      console.error('Error loading customer invoice details:', error);
      alert('Failed to load customer details. Please try again.');
    } finally {
      setLoadingCustomerDetails(false);
    }
  };

  const handleBackToOverview = () => {
    setSelectedCustomer(null);
    setCustomerInvoices([]);
  };

  const generatePDF = async () => {
    if (!reportData) {
      alert('No report data available to generate PDF.');
      return;
    }

    setIsPdfGenerating(true);
    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportData,
          reportPeriod,
          selectedDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create object URL and open in new tab
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Cleanup after a delay to ensure the PDF loads
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const getDateRangeText = () => {
    if (reportPeriod === 'custom' && customStartDate && customEndDate) {
      const startDateObj = new Date(customStartDate);
      const endDateObj = new Date(customEndDate);
      return `${format(startDateObj, 'MMM dd, yyyy')} - ${format(endDateObj, 'MMM dd, yyyy')}`;
    }
    
    const selectedDateObj = new Date(selectedDate);
    
    switch (reportPeriod) {
      case 'daily':
        return format(selectedDateObj, 'MMMM dd, yyyy');
      case 'weekly':
        const weekStart = startOfWeek(selectedDateObj, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(selectedDateObj, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
      case 'monthly':
        return format(selectedDateObj, 'MMMM yyyy');
      case 'annually':
        return format(selectedDateObj, 'yyyy');
      default:
        return format(selectedDateObj, 'MMMM dd, yyyy');
    }
  };

  const getStatusColor = (status: 'good' | 'warning' | 'overdue') => {
    switch (status) {
      case 'good': 
        return 'text-green-600 bg-green-100';
      case 'warning': 
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue': 
        return 'text-red-600 bg-red-100';
      default: 
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'overdue') => {
    switch (status) {
      case 'good': 
        return <FiCheckCircle className="w-4 h-4" />;
      case 'warning': 
        return <FiAlertCircle className="w-4 h-4" />;
      case 'overdue': 
        return <FiAlertCircle className="w-4 h-4" />;
      default: 
        return <FiFileText className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        {/* Sidebar - Fixed positioning */}
        <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
          <SellerSidebar />
        </div>
        
        {/* Mobile Sidebar Toggle - Skeleton */}
        <div className="md:hidden fixed top-4 left-4 z-20">
          <SkeletonComponents.Skeleton height="h-12" width="w-12" rounded="rounded-lg" />
        </div>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
          <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
            <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <SkeletonComponents.Skeleton height="h-8" width="w-64" />
                <SkeletonComponents.Skeleton height="h-4" width="w-96" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <SkeletonComponents.Skeleton height="h-10" width="w-48" />
                <SkeletonComponents.Skeleton height="h-10" width="w-40" />
                <SkeletonComponents.Skeleton height="h-10" width="w-32" />
              </div>
            </div>

            {/* Summary Cards Skeleton */}
            <SkeletonComponents.SkeletonDashboardCards count={4} />

            {/* Charts Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
                <SkeletonComponents.Skeleton height="h-64" width="w-full" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
                <SkeletonComponents.Skeleton height="h-64" width="w-full" />
              </div>
            </div>

            {/* Top Products and Customers Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
                <SkeletonComponents.SkeletonText lines={5} />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
                <SkeletonComponents.SkeletonText lines={5} />
              </div>
            </div>

            {/* Table Skeleton */}
            <SkeletonComponents.SkeletonTable rows={8} cols={6} showHeader={true} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar - Fixed positioning */}
      <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
        <SellerSidebar />
      </div>

      {/* Mobile Header */}
      <SellerHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Mobile Sidebar Drawer */}
      <SellerSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
        <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
              <p className="text-gray-600 mt-1">Comprehensive business analytics and financial insights</p>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                {reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Report: {getDateRangeText()}
                {reportPeriod === 'weekly' && (
                  <span className="block text-xs text-gray-400 mt-1">
                    * Weekly periods run from Monday to Sunday
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Period Selector */}
              <div className="flex flex-wrap bg-gray-100 rounded-lg p-1 gap-1">
                {(['daily', 'weekly', 'monthly', 'annually', 'custom'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setReportPeriod(period)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      reportPeriod === period
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>

              {/* Date Picker - Conditional rendering based on period */}
              {reportPeriod === 'custom' ? (
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="From"
                    />
                    <span className="text-gray-500 self-center">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="To"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    title={
                      reportPeriod === 'weekly' 
                        ? 'Select any date within the week you want to view' 
                        : reportPeriod === 'annually'
                        ? 'Select any date in the year to view'
                        : `Select ${reportPeriod === 'daily' ? 'the day' : 'any date in the month'} to view`
                    }
                  />
                </div>
              )}

              {/* View PDF Button */}
              <button
                onClick={generatePDF}
                disabled={isPdfGenerating}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
              >
                {isPdfGenerating ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FiFileText className="w-5 h-5" />
                    View PDF Report
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {reportData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">€{reportData.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-green-600">Paid: €{reportData.totalPaidAmount.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <FiDollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Outstanding Amount</p>
                    <p className="text-2xl font-bold text-red-600">€{reportData.totalOutstanding.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{reportData.partialOrders + reportData.unpaidOrders} orders</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-lg">
                    <FiAlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalOrders}</p>
                    <p className="text-xs text-gray-500">
                      {reportData.paidOrders} paid, {reportData.partialOrders} partial, {reportData.unpaidOrders} pending
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FiFileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.activeCustomers}</p>
                    <p className="text-xs text-gray-500">of {reportData.totalCustomers} total</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FiUsers className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Revenue Trend Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Status Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.paymentStatus}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      >
                        {reportData.paymentStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getPaymentStatusColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Top Products and Customers */}
          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
                <div className="space-y-4">
                  {reportData.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.quantity} units sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">€{product.revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Customers */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
                <div className="space-y-4">
                  {reportData.topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.orderCount} orders</p>
                        <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          <span>Paid: €{customer.totalPaid.toFixed(2)}</span>
                          {customer.totalOutstanding > 0 && (
                            <span className="text-red-600">Due: €{customer.totalOutstanding.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">€{customer.totalSpent.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          customer.totalOutstanding === 0 ? 'bg-green-100 text-green-700' : 
                          customer.totalOutstanding <= customer.totalSpent * 0.3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {customer.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Customer Payment Status Table */}
          {!selectedCustomer && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Customer Payment Status</h3>
                <p className="text-sm text-gray-600 mt-1">Detailed payment tracking for all customers - Click &quot;View Report&quot; to see invoice-level details</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Orders</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Paid Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Unpaid Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Order</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {customerPayments.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-gray-500 text-xs">{customer.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-gray-900">{customer.totalOrders}</p>
                            <p className="text-xs text-gray-500">
                              {customer.paidOrders} paid
                              {customer.partialOrders > 0 && `, ${customer.partialOrders} partial`}
                              {customer.unpaidOrders > 0 && `, ${customer.unpaidOrders} pending`}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-green-600">
                          €{customer.paidAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-medium text-red-600">
                          €{customer.unpaidAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {customer.lastOrderDate ? format(new Date(customer.lastOrderDate), 'MMM dd, yyyy') : 'Never'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                            {getStatusIcon(customer.status)}
                            {customer.status === 'good' ? 'Good Standing' : 
                             customer.status === 'warning' ? 'Payment Due' : 'Overdue'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => loadCustomerInvoiceDetails(customer)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <FiFileText className="w-3.5 h-3.5" />
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Individual Customer Report Detail View */}
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={handleBackToOverview}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Overview</span>
              </button>

              {/* Customer Header Card */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedCustomer.name}</h2>
                    <p className="text-blue-100 text-sm">{selectedCustomer.email}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Total Orders</p>
                      <p className="text-2xl font-bold">{selectedCustomer.totalOrders}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Total Amount</p>
                      <p className="text-2xl font-bold">€{selectedCustomer.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Paid</p>
                      <p className="text-2xl font-bold text-green-300">€{selectedCustomer.paidAmount.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Outstanding</p>
                      <p className="text-2xl font-bold text-red-300">€{selectedCustomer.unpaidAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Details Table */}
              {loadingCustomerDetails ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 flex items-center justify-center">
                  <div className="text-center">
                    <FiLoader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading invoice details...</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Showing all {customerInvoices.length} invoice{customerInvoices.length !== 1 ? 's' : ''} for this customer
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Export to CSV functionality
                        const csvContent = [
                          ['Invoice #', 'Date', 'Due Date', 'Total Amount', 'Paid Amount', 'Outstanding', 'Payment Status', 'Payment Method', 'Order Status'].join(','),
                          ...customerInvoices.map(inv => [
                            inv.invoiceNumber,
                            format(new Date(inv.invoiceDate), 'yyyy-MM-dd'),
                            format(new Date(inv.dueDate), 'yyyy-MM-dd'),
                            inv.totalAmount.toFixed(2),
                            inv.paidAmount.toFixed(2),
                            inv.outstandingAmount.toFixed(2),
                            inv.paymentStatus,
                            inv.paymentMethod,
                            inv.orderStatus
                          ].join(','))
                        ].join('\n');
                        
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${selectedCustomer.name}-invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FiDownload className="w-4 h-4" />
                      Export to CSV
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    {customerInvoices.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">
                        <FiFileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No invoices found</p>
                        <p className="text-sm mt-1">This customer hasn&apos;t placed any orders yet.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice #</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Due Date</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Paid Amount</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Outstanding</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Payment Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Payment Method</th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Order Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {customerInvoices.map((invoice) => (
                            <tr key={invoice.orderId} className="hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <span className="font-mono text-xs font-medium text-blue-600">
                                  {invoice.invoiceNumber}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-900">
                                {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-gray-900">
                                €{invoice.totalAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-green-600">
                                €{invoice.paidAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-red-600">
                                €{invoice.outstandingAmount.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                  invoice.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {invoice.paymentStatus === 'paid' ? 'Paid' :
                                   invoice.paymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600 text-xs">
                                {invoice.paymentMethod}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  invoice.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                                  invoice.orderStatus === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                  invoice.orderStatus === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {invoice.orderStatus.charAt(0).toUpperCase() + invoice.orderStatus.slice(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                          <tr>
                            <td colSpan={3} className="py-4 px-4 text-right font-bold text-gray-900">
                              TOTALS:
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-gray-900">
                              €{customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-green-700">
                              €{customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-red-700">
                              €{customerInvoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0).toFixed(2)}
                            </td>
                            <td colSpan={3}></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Custom loading skeleton for reports page
const ReportsLoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
    {/* Sidebar - Fixed positioning */}
    <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
      <SellerSidebar />
    </div>
    
    {/* Main Content */}
    <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
      <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <SkeletonComponents.Skeleton height="h-8" width="w-64" />
            <SkeletonComponents.Skeleton height="h-4" width="w-96" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <SkeletonComponents.Skeleton height="h-10" width="w-48" />
            <SkeletonComponents.Skeleton height="h-10" width="w-40" />
            <SkeletonComponents.Skeleton height="h-10" width="w-32" />
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <SkeletonComponents.SkeletonDashboardCards count={4} />

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
            <SkeletonComponents.Skeleton height="h-64" width="w-full" />
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
            <SkeletonComponents.Skeleton height="h-64" width="w-full" />
          </div>
        </div>

        {/* Top sections Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonComponents.SkeletonCard />
          <SkeletonComponents.SkeletonCard />
        </div>

        {/* Table Skeleton */}
        <SkeletonComponents.SkeletonTable rows={8} cols={6} showHeader={true} />
        </div>
      </div>
    </main>
  </div>
);

export default function ReportsPage() {
  return (
    <SellerGuard loadingSkeleton={<ReportsLoadingSkeleton />}>
      <ReportsPageContent />
    </SellerGuard>
  );
}
