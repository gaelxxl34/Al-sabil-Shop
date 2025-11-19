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
  FiDownload,
} from "react-icons/fi";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import SellerHeader from "@/components/SellerHeader";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import AdminSidebarDrawer from "@/components/AdminSidebarDrawer";
import AdminGuard from "@/components/AdminGuard";
import { useAuth } from "@/components/AuthProvider";
import SkeletonComponents from "@/components/SkeletonLoader";
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
    id: string;
    name: string; 
    email?: string;
    businessName?: string;
    companyName?: string;
    contactPerson?: string;
    totalSpent: number; 
    totalPaid: number;
    totalOutstanding: number;
    orderCount: number; 
    paidOrders: number;
    partialOrders: number;
    unpaidOrders: number;
    status: string;
    lastOrderDate: string | null;
  }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  paymentStatus: Array<{ name: string; value: number; percentage: number }>;
}

interface CustomerPaymentStatus {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  contactPerson?: string;
  companyName?: string;
  totalOrders: number;
  paidOrders: number;
  partialOrders: number;
  unpaidOrders: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  lastOrderDate: string | null;
  status: 'good' | 'warning' | 'overdue';
  address?: string;
  phone?: string;
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

interface CreditNoteDetail {
  id: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  amount: number;
  reason: string;
  notes: string;
  relatedOrderId?: string;
  relatedInvoiceNumber?: string;
}

interface OrderSummary {
  id: string;
  createdAt: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  totalPaid?: number;
  paidAmount?: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: string;
  status: string;
}

interface TransactionSummary {
  id: string;
  type: string;
  amount: number;
  notes?: string;
  transactionDate?: string;
  createdAt: string;
  relatedOrderId?: string;
}

interface SellerOption {
  id: string;
  name: string;
  email: string;
  companyName?: string;
}

const resolveCustomerDisplayName = (customer: {
  name?: string | null;
  businessName?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  email?: string | null;
}) => {
  const sanitize = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

  const nameCandidates = [
    sanitize(customer.name),
    sanitize(customer.businessName),
    sanitize(customer.companyName),
    sanitize(customer.contactPerson),
  ];

  const displayName = nameCandidates.find((candidate) => candidate.length > 0);
  if (displayName) {
    return displayName;
  }

  const email = sanitize(customer.email);
  return email || 'Customer';
};

function ReportsPageContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const isAdmin = userData?.role === 'admin';
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [sellerOptions, setSellerOptions] = useState<SellerOption[]>([]);
  const [isSellerLoading, setIsSellerLoading] = useState(false);
  const [hasInitializedSeller, setHasInitializedSeller] = useState(false);
  const userSellerId = user?.uid ?? null;
  const effectiveSellerId = isAdmin ? selectedSellerId : userSellerId ?? '';
  const canLoadReports = !isAdmin || Boolean(effectiveSellerId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'annually' | 'custom'>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isReportCsvGenerating, setIsReportCsvGenerating] = useState(false);
  const [isCustomerCsvGenerating, setIsCustomerCsvGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [customerPayments, setCustomerPayments] = useState<CustomerPaymentStatus[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Individual Customer Report States
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPaymentStatus | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoiceDetail[]>([]);
  const [customerCreditNotes, setCustomerCreditNotes] = useState<CreditNoteDetail[]>([]);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);
  const [isGeneratingCustomerPdf, setIsGeneratingCustomerPdf] = useState(false);

  useEffect(() => {
    if (!effectiveSellerId) {
      setReportData(null);
      setCustomerPayments([]);
      setSelectedCustomer(null);
      setCustomerInvoices([]);
      setCustomerCreditNotes([]);
      return;
    }

    if (isAdmin) {
      setReportData(null);
      setCustomerPayments([]);
      setSelectedCustomer(null);
      setCustomerInvoices([]);
      setCustomerCreditNotes([]);
    }
  }, [effectiveSellerId, isAdmin]);

  useEffect(() => {
    if (authLoading || isAdmin) {
      return;
    }

    if (!selectedSellerId && userSellerId) {
      setSelectedSellerId(userSellerId);
    }
  }, [authLoading, isAdmin, selectedSellerId, userSellerId]);

  useEffect(() => {
    if (authLoading || !isAdmin) {
      return;
    }

    if (sellerOptions.length > 0 && hasInitializedSeller) {
      return;
    }

    const loadSellers = async () => {
      try {
        setIsSellerLoading(true);
        const response = await fetch('/api/users');
        if (!response.ok) {
          console.error('Failed to fetch sellers:', response.status);
          return;
        }

        const data = await response.json();
        const sellers = Array.isArray(data.data)
          ? data.data.filter((userRecord: { role?: string }) => userRecord.role === 'seller')
          : [];

        const formatted: SellerOption[] = sellers
          .map((seller: { id: string; email?: string; displayName?: string; companyName?: string }) => ({
            id: seller.id,
            email: seller.email || '',
            name: seller.displayName || seller.companyName || seller.email || 'Seller',
            companyName: seller.companyName,
          }))
          .sort((a: SellerOption, b: SellerOption) => a.name.localeCompare(b.name));

        setSellerOptions(formatted);

        if (!hasInitializedSeller && formatted.length > 0) {
          setSelectedSellerId((current) => current || formatted[0].id);
          setHasInitializedSeller(true);
        }
      } catch (error) {
        console.error('Error fetching sellers:', error);
      } finally {
        setIsSellerLoading(false);
      }
    };

    loadSellers();
  }, [authLoading, hasInitializedSeller, isAdmin, sellerOptions.length]);

  const formatCurrency = (value: number) => `€${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(0) : '0'}%`;

  const sanitizeFileName = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      || 'report';

  const downloadCsv = (rows: Array<Array<string | number | null>>, fileName: string) => {
    if (!rows.length) {
      return;
    }

    const escapeValue = (value: string | number | null) => {
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = typeof value === 'number' ? String(value) : value;
      const needsEscaping = /[",\n\r]/.test(stringValue);
      const safeValue = stringValue.replace(/"/g, '""');
      return needsEscaping ? `"${safeValue}"` : safeValue;
    };

    const csv = rows
      .map((row) => row.map(escapeValue).join(','))
      .join('\r\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const loadReportData = useCallback(async () => {
    if (!canLoadReports || !effectiveSellerId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Build query parameters
      let queryParams = `period=${reportPeriod}&sellerId=${encodeURIComponent(effectiveSellerId)}`;
      
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
        const normalizedTopCustomers: ReportData['topCustomers'] = (data.topCustomers as Array<{
          id: string;
          name?: string | null;
          email?: string | null;
          businessName?: string | null;
          companyName?: string | null;
          contactPerson?: string | null;
          totalSpent: number;
          totalPaid: number;
          totalOutstanding: number;
          orderCount: number;
          paidOrders: number;
          partialOrders: number;
          unpaidOrders: number;
          status: string;
          lastOrderDate?: string | null;
        }>).map((customer) => {
          const sanitize = (value?: string | null) => {
            if (typeof value !== 'string') return undefined;
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : undefined;
          };

          return {
            id: customer.id,
            name: resolveCustomerDisplayName({
              name: typeof customer.name === 'string' ? customer.name : null,
              businessName: customer.businessName,
              companyName: customer.companyName,
              contactPerson: customer.contactPerson,
              email: customer.email,
            }),
            email: sanitize(customer.email),
            businessName: sanitize(customer.businessName),
            companyName: sanitize(customer.companyName),
            contactPerson: sanitize(customer.contactPerson),
            totalSpent: customer.totalSpent,
            totalPaid: customer.totalPaid,
            totalOutstanding: customer.totalOutstanding,
            orderCount: customer.orderCount,
            paidOrders: customer.paidOrders,
            partialOrders: customer.partialOrders,
            unpaidOrders: customer.unpaidOrders,
            status: customer.status,
            lastOrderDate: typeof customer.lastOrderDate === 'string' ? customer.lastOrderDate : null,
          };
        });

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
          topCustomers: normalizedTopCustomers,
          topProducts: data.topProducts,
          paymentStatus: data.paymentAnalysis,
        };
        
        setReportData(processedData);
        
        // Process customer payment status
        const paymentStatus = normalizedTopCustomers.map((customer: { 
          id: string;
          name?: string | null;
          email?: string | null;
          businessName?: string | null;
          companyName?: string | null;
          contactPerson?: string | null;
          orderCount: number;
          paidOrders: number;
          partialOrders: number;
          unpaidOrders: number;
          totalSpent: number;
          totalPaid: number;
          totalOutstanding: number;
          lastOrderDate?: string | null;
        }) => {
          const totalAmount = customer.totalSpent ?? 0;
          const unpaidAmount = Math.max(customer.totalOutstanding ?? 0, 0);
          const paidAmount = Math.max(customer.totalPaid ?? 0, 0);

          const outstandingRatio = totalAmount > 0 ? unpaidAmount / totalAmount : 0;
          let status: 'good' | 'warning' | 'overdue';

          if (unpaidAmount <= 0.01) {
            status = 'good';
          } else if (outstandingRatio <= 0.3) {
            status = 'warning';
          } else {
            status = 'overdue';
          }

          const displayName = resolveCustomerDisplayName(customer);

          return {
            id: customer.id,
            name: displayName,
            email: customer.email ?? '',
            businessName: customer.businessName ?? undefined,
            companyName: customer.companyName ?? undefined,
            contactPerson: customer.contactPerson ?? undefined,
            totalOrders: customer.orderCount,
            paidOrders: customer.paidOrders,
            partialOrders: customer.partialOrders,
            unpaidOrders: customer.unpaidOrders,
            totalAmount,
            paidAmount,
            unpaidAmount,
            lastOrderDate: customer.lastOrderDate ?? null,
            status,
          };
        });
        
        setCustomerPayments(paymentStatus);
      } else {
        console.error('Failed to fetch report data:', reportsData.error);
        setReportData(null);
        setCustomerPayments([]);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
      setReportData(null);
      setCustomerPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [canLoadReports, customEndDate, customStartDate, effectiveSellerId, reportPeriod, selectedDate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const loadCustomerInvoiceDetails = async (customer: CustomerPaymentStatus) => {
    if (!effectiveSellerId) {
      return;
    }

    setLoadingCustomerDetails(true);
    
    try {
      // Fetch full customer details to get address and phone
      const customerResponse = await fetch(`/api/customers/${customer.id}`);
      const customerData = await customerResponse.json();
      
      console.log('Customer API Response:', customerData);
      console.log('Customer Response Status:', customerResponse.status);
      
      const apiCustomer = (customerData.success && customerData.data) ? customerData.data : {};

      // Create enhanced customer object with consistent naming and contact info
      const enhancedCustomer = {
        ...customer,
        name: resolveCustomerDisplayName({
          name: customer.name,
          businessName: customer.businessName ?? apiCustomer.businessName,
          companyName: apiCustomer.companyName,
          contactPerson: customer.contactPerson ?? apiCustomer.contactPerson,
          email: customer.email,
        }),
        businessName: customer.businessName ?? apiCustomer.businessName ?? undefined,
        companyName: customer.companyName ?? apiCustomer.companyName ?? undefined,
        contactPerson: customer.contactPerson ?? apiCustomer.contactPerson ?? undefined,
        address: apiCustomer.address || '',
        phone: apiCustomer.phone || '',
      };
      
      console.log('Enhanced Customer:', enhancedCustomer);
      
      setSelectedCustomer(enhancedCustomer);
      
      // Build query parameters with time period filter
      let ordersQuery = `customerId=${customer.id}&sellerId=${encodeURIComponent(effectiveSellerId)}&period=${reportPeriod}`;
      
      if (reportPeriod === 'custom') {
        if (customStartDate && customEndDate) {
          ordersQuery += `&startDate=${customStartDate}&endDate=${customEndDate}`;
        }
      } else {
        ordersQuery += `&date=${selectedDate}`;
      }
      
      // Fetch orders for this customer with time period filter
      const ordersResponse = await fetch(`/api/orders?${ordersQuery}`);
      const ordersData = await ordersResponse.json();
      
      // Fetch transactions (including credit notes) for this customer with time period filter
      let transactionsQuery = `customerId=${customer.id}&period=${reportPeriod}`;
      if (effectiveSellerId) {
        transactionsQuery += `&sellerId=${encodeURIComponent(effectiveSellerId)}`;
      }
      
      if (reportPeriod === 'custom') {
        if (customStartDate && customEndDate) {
          transactionsQuery += `&startDate=${customStartDate}&endDate=${customEndDate}`;
        }
      } else {
        transactionsQuery += `&date=${selectedDate}`;
      }
      
      const transactionsResponse = await fetch(`/api/transactions?${transactionsQuery}`);
      const transactionsData = await transactionsResponse.json();
      
      if (ordersData.success && ordersData.data) {
        // Transform orders into invoice details
        const invoices: CustomerInvoiceDetail[] = (ordersData.data as OrderSummary[]).map((order) => {
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
      
      // Process credit notes from transactions
      if (transactionsData.transactions) {
        const typedTransactions = transactionsData.transactions as TransactionSummary[];
        const creditNotes: CreditNoteDetail[] = typedTransactions
          .filter((txn) => txn.type === 'credit_note')
          .map((txn) => {
            const generateCreditNoteNumber = (txnId: string, createdAt: string) => {
              const date = new Date(createdAt);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const txnSuffix = txnId.slice(-6).toUpperCase();
              return `CN-${year}${month}-${txnSuffix}`;
            };
            
            // Find related invoice if available
            let relatedInvoiceNumber = '';
            if (txn.relatedOrderId) {
              const relatedInvoice = ordersData.data?.find((order: { id: string }) => order.id === txn.relatedOrderId);
              if (relatedInvoice) {
                const date = new Date(relatedInvoice.createdAt);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const orderSuffix = relatedInvoice.id.slice(-6).toUpperCase();
                relatedInvoiceNumber = `INV-${year}${month}-${orderSuffix}`;
              }
            }
            
            // Extract reason from notes if available
            const reasonMapping: Record<string, string> = {
              'returned_goods': 'Returned Goods',
              'quality_issue': 'Quality Issue',
              'wrong_items': 'Wrong Items',
              'damaged_goods': 'Damaged Goods',
              'pricing_error': 'Pricing Error',
              'customer_complaint': 'Customer Complaint',
              'other': 'Other'
            };
            
            // Try to extract reason from notes
            let reason = 'Credit Note';
            if (txn.notes) {
              const notesLower = txn.notes.toLowerCase();
              for (const [key, value] of Object.entries(reasonMapping)) {
                if (notesLower.includes(key.replace('_', ' '))) {
                  reason = value;
                  break;
                }
              }
            }
            
            return {
              id: txn.id,
              creditNoteNumber: generateCreditNoteNumber(txn.id, txn.createdAt),
              creditNoteDate: txn.transactionDate || txn.createdAt,
              amount: Math.abs(txn.amount), // Show as positive for display
              reason,
              notes: txn.notes || '',
              relatedOrderId: txn.relatedOrderId,
              relatedInvoiceNumber
            };
          });
        
        // Sort by date (newest first)
        creditNotes.sort((a, b) => new Date(b.creditNoteDate).getTime() - new Date(a.creditNoteDate).getTime());
        
        setCustomerCreditNotes(creditNotes);
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
    setCustomerCreditNotes([]);
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
          customStartDate: reportPeriod === 'custom' ? customStartDate : undefined,
          customEndDate: reportPeriod === 'custom' ? customEndDate : undefined,
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

  const exportReportCsv = () => {
    if (!reportData) {
      alert('No report data available to export.');
      return;
    }

    try {
      setIsReportCsvGenerating(true);
      const now = new Date();
      const rows: Array<Array<string | number | null>> = [];
      const periodLabel = reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1);

      rows.push([`${periodLabel} Report`]);
      rows.push(['Date Range', getDateRangeText()]);
      rows.push(['Generated At', format(now, 'yyyy-MM-dd HH:mm')]);
      rows.push(['']);

      rows.push(['Summary']);
      rows.push(['Metric', 'Value']);
      rows.push(['Total Revenue', formatCurrency(reportData.totalRevenue)]);
      rows.push(['Collected (Paid Portions)', formatCurrency(reportData.totalPaidAmount)]);
      rows.push(['Outstanding', formatCurrency(reportData.totalOutstanding)]);
      rows.push(['Total Orders', reportData.totalOrders]);
      rows.push(['Paid Orders', reportData.paidOrders]);
      rows.push(['Partial Orders', reportData.partialOrders]);
      rows.push(['Pending/Overdue Orders', reportData.unpaidOrders]);
      rows.push(['Average Order Value', formatCurrency(reportData.averageOrderValue)]);
      rows.push(['Delivery Revenue', formatCurrency(reportData.deliveryRevenue)]);
      rows.push(['Product Revenue', formatCurrency(reportData.productRevenue)]);
      rows.push(['Active Customers', `${reportData.activeCustomers} of ${reportData.totalCustomers}`]);
      rows.push(['']);

      if (reportData.paymentStatus.length) {
        rows.push(['Payment Status Breakdown']);
        rows.push(['Status', 'Amount', 'Percentage']);
        reportData.paymentStatus.forEach((segment) => {
          rows.push([
            segment.name,
            formatCurrency(segment.value),
            `${segment.percentage.toFixed(1)}%`,
          ]);
        });
        rows.push(['']);
      }

      if (reportData.dailyRevenue.length) {
        rows.push(['Revenue Trend']);
        rows.push(['Date', 'Revenue', 'Orders']);
        reportData.dailyRevenue.forEach((entry) => {
          rows.push([
            entry.date,
            formatCurrency(entry.revenue),
            entry.orders,
          ]);
        });
        rows.push(['']);
      }

      if (reportData.topCustomers.length) {
        rows.push(['Top Customers']);
        rows.push(['Customer', 'Total Spent', 'Paid', 'Outstanding', 'Orders', 'Last Order']);
        reportData.topCustomers.forEach((customer) => {
          rows.push([
            customer.name,
            formatCurrency(customer.totalSpent),
            formatCurrency(customer.totalPaid),
            formatCurrency(customer.totalOutstanding),
            customer.orderCount,
            customer.lastOrderDate ? format(new Date(customer.lastOrderDate), 'yyyy-MM-dd') : '—',
          ]);
        });
        rows.push(['']);
      }

      if (reportData.topProducts.length) {
        rows.push(['Top Products']);
        rows.push(['Product', 'Quantity Sold', 'Revenue']);
        reportData.topProducts.forEach((product) => {
          rows.push([
            product.name,
            product.quantity,
            formatCurrency(product.revenue),
          ]);
        });
        rows.push(['']);
      }

      const safeFileName = sanitizeFileName(
        `financial-report-${reportPeriod}-${format(now, 'yyyy-MM-dd')}`
      );
      downloadCsv(rows, `${safeFileName}.csv`);
    } finally {
      setIsReportCsvGenerating(false);
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

  const collectionRate = reportData && reportData.totalRevenue > 0
    ? (reportData.totalPaidAmount / reportData.totalRevenue) * 100
    : 0;

  const outstandingShare = reportData && reportData.totalRevenue > 0
    ? (reportData.totalOutstanding / reportData.totalRevenue) * 100
    : 0;

  const topProductName = reportData?.topProducts[0]?.name ?? '—';
  const topCustomer = reportData?.topCustomers[0];
  const topCustomerName = topCustomer ? resolveCustomerDisplayName(topCustomer) : 'No orders yet';
  const reportPeriodLabel = reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1);
  const shouldSelectSeller = isAdmin && !effectiveSellerId && !isSellerLoading;
  const disableReportExports = shouldSelectSeller || !reportData || isSellerLoading;
  const filtersGridLayout = isAdmin ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3';
  const periodOptions: Array<{ value: 'daily' | 'weekly' | 'monthly' | 'annually' | 'custom'; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'annually', label: 'Annually' },
    { value: 'custom', label: 'Custom' },
  ];


  const highlightItems = reportData ? [
    {
      label: 'Collection rate',
      value: formatPercent(collectionRate),
      note: `${formatCurrency(reportData.totalPaidAmount)} collected so far`,
    },
    {
      label: 'Outstanding balance',
      value: reportData.totalOutstanding > 0 ? formatCurrency(reportData.totalOutstanding) : 'Fully paid',
      note: outstandingShare > 0 ? `${formatPercent(outstandingShare)} of total revenue` : 'No outstanding balance',
    },
    {
      label: 'Top customer',
      value: topCustomer ? topCustomerName : 'No orders yet',
      note: topCustomer ? `${formatCurrency(topCustomer.totalSpent)} across ${topCustomer.orderCount} orders` : '—',
    },
    {
      label: 'Best-selling product',
      value: topProductName,
      note: reportData.topProducts[0]
        ? `${reportData.topProducts[0].quantity} units sold`
        : 'No sales in this period',
    },
  ] : [];

  const exportCustomerInvoicesCsv = () => {
    if (!selectedCustomer) {
      return;
    }

    if (!customerInvoices.length && !customerCreditNotes.length) {
      alert('No invoice or credit note data available to export for this customer.');
      return;
    }

    try {
      setIsCustomerCsvGenerating(true);
      const rows: Array<Array<string | number | null>> = [];
      const now = new Date();
      const periodLabel = reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1);

      rows.push([
        `${selectedCustomer.name} (${selectedCustomer.email}) Invoice History`,
      ]);
      rows.push(['Period', `${periodLabel} - ${getDateRangeText()}`]);
      rows.push(['Generated At', format(now, 'yyyy-MM-dd HH:mm')]);
      rows.push(['']);

      // Invoices section
      if (customerInvoices.length > 0) {
        rows.push(['INVOICES']);
        rows.push([
          'Invoice #',
          'Invoice Date',
          'Due Date',
          'Total Amount',
          'Paid Amount',
          'Outstanding',
          'Payment Status',
          'Payment Method',
          'Order Status',
        ]);

        customerInvoices.forEach((invoice) => {
          rows.push([
            invoice.invoiceNumber,
            format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
            format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
            formatCurrency(invoice.totalAmount),
            formatCurrency(invoice.paidAmount),
            formatCurrency(invoice.outstandingAmount),
            invoice.paymentStatus,
            invoice.paymentMethod,
            invoice.orderStatus,
          ]);
        });

        rows.push(['']);
        rows.push([
          'INVOICE TOTALS',
          '',
          '',
          formatCurrency(customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)),
          formatCurrency(customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)),
          formatCurrency(customerInvoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0)),
          '',
          '',
          '',
        ]);
        rows.push(['']);
      }

      // Credit Notes section
      if (customerCreditNotes.length > 0) {
        rows.push(['CREDIT NOTES']);
        rows.push([
          'Credit Note #',
          'Date',
          'Amount',
          'Reason',
          'Related Invoice',
          'Notes',
        ]);

        customerCreditNotes.forEach((cn) => {
          rows.push([
            cn.creditNoteNumber,
            format(new Date(cn.creditNoteDate), 'yyyy-MM-dd'),
            formatCurrency(cn.amount),
            cn.reason,
            cn.relatedInvoiceNumber || '—',
            cn.notes || '—',
          ]);
        });

        rows.push(['']);
        rows.push([
          'CREDIT NOTE TOTAL',
          '',
          formatCurrency(customerCreditNotes.reduce((sum, cn) => sum + cn.amount, 0)),
          '',
          '',
          '',
        ]);
        rows.push(['']);
      }

      // Grand totals
      const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const totalCreditNotes = customerCreditNotes.reduce((sum, cn) => sum + cn.amount, 0);
      const netAmount = totalInvoiced - totalCreditNotes;
      
      rows.push(['SUMMARY']);
      rows.push(['Total Invoiced', formatCurrency(totalInvoiced)]);
      rows.push(['Total Credit Notes', formatCurrency(totalCreditNotes)]);
      rows.push(['Net Amount', formatCurrency(netAmount)]);
      rows.push(['Total Paid', formatCurrency(selectedCustomer.paidAmount)]);
      rows.push(['Balance Outstanding', formatCurrency(selectedCustomer.unpaidAmount)]);

      const safeFileName = sanitizeFileName(
        `${selectedCustomer.name}-statement-${format(now, 'yyyy-MM-dd')}`
      );
      downloadCsv(rows, `${safeFileName}.csv`);
    } finally {
      setIsCustomerCsvGenerating(false);
    }
  };

  const generateCustomerReportPDF = async () => {
    if (!selectedCustomer) {
      alert('No customer selected for report generation.');
      return;
    }

    setIsGeneratingCustomerPdf(true);
    try {
      const response = await fetch('/api/generate-customer-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: selectedCustomer,
          invoices: customerInvoices,
          creditNotes: customerCreditNotes,
          reportDate: new Date().toISOString(),
          reportPeriod,
          selectedDate,
          customStartDate: reportPeriod === 'custom' ? customStartDate : undefined,
          customEndDate: reportPeriod === 'custom' ? customEndDate : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate customer report PDF');
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
      console.error('Error generating customer report PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingCustomerPdf(false);
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

            {/* Summary Skeleton */}
            <SkeletonComponents.SkeletonCard />

            {/* Overview Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SkeletonComponents.SkeletonCard />
              <SkeletonComponents.SkeletonCard />
            </div>

            {/* Top Products and Customers Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
                <SkeletonComponents.SkeletonText lines={4} />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-4" />
                <SkeletonComponents.SkeletonText lines={4} />
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
        {isAdmin ? <AdminSidebar /> : <SellerSidebar />}
      </div>

      {/* Mobile Header */}
        {isAdmin ? (
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} title="Admin Reports" />
        ) : (
        <SellerHeader onMenuClick={() => setSidebarOpen(true)} />
      )}

      {/* Mobile Sidebar Drawer */}
      {isAdmin ? (
        <AdminSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : (
        <SellerSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
        <div className="w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
          {/* Header */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 lg:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Insights</p>
                  <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
                  <p className="text-gray-600 mt-1">Comprehensive business analytics and financial insights</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 font-medium">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-700 text-xs font-semibold">
                      {reportPeriodLabel} View
                    </span>
                    <span>Period: {getDateRangeText()}</span>
                  </div>
                  {reportPeriod === 'weekly' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Weekly periods run from Monday to Sunday
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:justify-end">
                  <button
                    onClick={exportReportCsv}
                    disabled={disableReportExports || isReportCsvGenerating}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReportCsvGenerating ? (
                      <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        Preparing CSV...
                      </>
                    ) : (
                      <>
                        <FiDownload className="w-5 h-5" />
                        Download CSV
                      </>
                    )}
                  </button>
                  <button
                    onClick={generatePDF}
                    disabled={disableReportExports || isPdfGenerating}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                  >
                    {isPdfGenerating ? (
                      <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FiFileText className="w-5 h-5" />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className={`mt-6 grid grid-cols-1 gap-4 ${filtersGridLayout}`}>
                {isAdmin && (
                  <div className="bg-slate-50/70 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                    <label className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                      <FiUsers className="w-4 h-4 text-blue-500" />
                      Seller
                    </label>
                    <p className="text-xs text-gray-500">
                      Switch between seller accounts to compare performance.
                    </p>
                    <select
                      value={selectedSellerId}
                      onChange={(event) => setSelectedSellerId(event.target.value)}
                      disabled={isSellerLoading || sellerOptions.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                    >
                      <option value="">
                        {isSellerLoading ? 'Loading sellers…' : 'Select seller'}
                      </option>
                      {sellerOptions.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={`bg-slate-50/70 border border-gray-200 rounded-xl p-4 flex flex-col gap-3 ${isAdmin ? 'md:col-span-2 xl:col-span-2' : 'md:col-span-2 xl:col-span-2'}`}>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-gray-600">Reporting cadence</span>
                    <span>Pick the comparison window</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {periodOptions.map((period) => (
                      <button
                        key={period.value}
                        onClick={() => setReportPeriod(period.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                          reportPeriod === period.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-600 border-transparent hover:border-gray-200'
                        }`}
                        aria-pressed={reportPeriod === period.value}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-gray-600">Date focus</span>
                    <span>{reportPeriod === 'custom' ? 'Select a range' : 'Anchor date'}</span>
                  </div>
                  {reportPeriod === 'custom' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-xs text-gray-500">
                        <span className="mb-1 block font-medium text-gray-600">From</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Start date"
                        />
                      </label>
                      <label className="text-xs text-gray-500">
                        <span className="mb-1 block font-medium text-gray-600">To</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="End date"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="text-xs text-gray-500">
                      <span className="mb-1 block font-medium text-gray-600">Choose date</span>
                      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                        <FiCalendar className="w-5 h-5 text-gray-500" />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="flex-1 text-sm focus:outline-none"
                          title={
                            reportPeriod === 'weekly'
                              ? 'Select any date within the week you want to view'
                              : reportPeriod === 'annually'
                              ? 'Select any date in the year to view'
                              : `Select ${reportPeriod === 'daily' ? 'the day' : 'any date in the month'} to view`
                          }
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {shouldSelectSeller && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
              Select a seller to load financial reports.
            </div>
          )}

          {!shouldSelectSeller && (
            <>
          {/* Summary Overview */}
          {reportData && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Report Highlights</h2>
                <p className="text-sm text-gray-500 mt-1">Key takeaways for this {reportPeriodLabel.toLowerCase()} period</p>
                <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {highlightItems.map((item) => (
                    <div key={item.label} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">{item.value}</dd>
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.note}</p>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
                      <p className="text-sm text-gray-500 mt-1">Snapshot of income, collections, and exposure</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <FiDollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Total Revenue</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {formatCurrency(reportData.totalRevenue)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(reportData.productRevenue)} products · {formatCurrency(reportData.deliveryRevenue)} delivery
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Collected</p>
                      <p className="text-xl font-bold text-green-600 mt-1">
                        {formatCurrency(reportData.totalPaidAmount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatPercent(collectionRate)} of total revenue</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Outstanding</p>
                      <p className="text-xl font-bold text-red-600 mt-1">
                        {formatCurrency(reportData.totalOutstanding)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {reportData.partialOrders + reportData.unpaidOrders} orders pending</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Average Order Value</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {formatCurrency(reportData.averageOrderValue)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Across {reportData.totalOrders} orders</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Customers & Orders</h3>
                      <p className="text-sm text-gray-500 mt-1">Customer activity and order mix</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FiUsers className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Active Customers</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {reportData.activeCustomers}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">of {reportData.totalCustomers} customers</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Order Status Mix</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {reportData.totalOrders}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {reportData.paidOrders} paid · {reportData.partialOrders} partial · {reportData.unpaidOrders} pending
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Primary Payment State</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {reportData.paymentStatus[0]?.name ?? 'No data'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {reportData.paymentStatus[0]
                          ? `${formatCurrency(reportData.paymentStatus[0].value)} · ${formatPercent(reportData.paymentStatus[0].percentage)}`
                          : 'No payments recorded'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Last Order Date</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {reportData.topCustomers[0]?.lastOrderDate
                          ? format(new Date(reportData.topCustomers[0].lastOrderDate), 'MMM dd, yyyy')
                          : 'No orders'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Top customer activity</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Top Products and Customers */}
          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Top Products</h3>
                <p className="text-xs text-gray-500 mb-3">Top selling items for the selected period</p>
                <div className="space-y-3">
                  {reportData.topProducts.slice(0, 3).map((product, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} units · {formatCurrency(product.revenue)}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                    </div>
                  ))}
                  {reportData.topProducts.length > 3 && (
                    <p className="text-xs text-gray-400 text-right">{reportData.topProducts.length - 3} more product{reportData.topProducts.length - 3 === 1 ? '' : 's'} in report</p>
                  )}
                </div>
              </div>

              {/* Top Customers */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Top Customers</h3>
                <p className="text-xs text-gray-500 mb-3">Customers driving the majority of revenue</p>
                <div className="space-y-3">
                  {reportData.topCustomers.slice(0, 3).map((customer, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.orderCount} orders · {formatCurrency(customer.totalSpent)}</p>
                        {customer.lastOrderDate && (
                          <p className="text-xs text-gray-400 mt-1">Last order {format(new Date(customer.lastOrderDate), 'MMM dd, yyyy')}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        customer.totalOutstanding === 0 ? 'bg-green-100 text-green-700' : 
                        customer.totalOutstanding <= customer.totalSpent * 0.3 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {customer.status}
                      </span>
                    </div>
                  ))}
                  {reportData.topCustomers.length > 3 && (
                    <p className="text-xs text-gray-400 text-right">{reportData.topCustomers.length - 3} more customer{reportData.topCustomers.length - 3 === 1 ? '' : 's'} in report</p>
                  )}
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
                            <p className="font-medium text-gray-900">
                              {customer.businessName || customer.contactPerson || `Customer ${customer.id.slice(-4)}`}
                            </p>
                            {customer.email && (
                              <p className="text-gray-500 text-xs">{customer.email}</p>
                            )}
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
                          {formatCurrency(customer.paidAmount)}
                        </td>
                        <td className="py-3 px-4 font-medium text-red-600">
                          {formatCurrency(customer.unpaidAmount)}
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
                    <p className="text-blue-200 text-xs mt-2">
                      <strong>Period:</strong> {reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} ({getDateRangeText()})
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Total Orders</p>
                      <p className="text-2xl font-bold">{selectedCustomer.totalOrders}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Total Amount</p>
                      <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.totalAmount)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Paid</p>
                      <p className="text-2xl font-bold text-green-300">{formatCurrency(selectedCustomer.paidAmount)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-blue-100 mb-1">Outstanding</p>
                      <p className="text-2xl font-bold text-red-300">{formatCurrency(selectedCustomer.unpaidAmount)}</p>
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
                <>
                  {/* Invoices Section */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Showing all {customerInvoices.length} invoice{customerInvoices.length !== 1 ? 's' : ''} for this customer
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={exportCustomerInvoicesCsv}
                          disabled={isCustomerCsvGenerating}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCustomerCsvGenerating ? (
                            <>
                              <FiLoader className="w-4 h-4 animate-spin" />
                              Exporting...
                            </>
                          ) : (
                            <>
                              <FiDownload className="w-4 h-4" />
                              Export to CSV
                            </>
                          )}
                        </button>
                        <button
                          onClick={generateCustomerReportPDF}
                          disabled={isGeneratingCustomerPdf}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingCustomerPdf ? (
                            <>
                              <FiLoader className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FiFileText className="w-4 h-4" />
                              Generate PDF Report
                            </>
                          )}
                        </button>
                      </div>
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
                                  {formatCurrency(invoice.totalAmount)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-green-600">
                                  {formatCurrency(invoice.paidAmount)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-red-600">
                                  {formatCurrency(invoice.outstandingAmount)}
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
                                INVOICE TOTALS:
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-gray-900">
                                {formatCurrency(customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-green-700">
                                {formatCurrency(customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0))}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-red-700">
                                {formatCurrency(customerInvoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0))}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Credit Notes Section */}
                  {customerCreditNotes.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mt-6">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Credit Notes</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {customerCreditNotes.length} credit note{customerCreditNotes.length !== 1 ? 's' : ''} issued
                        </p>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Credit Note #</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Related Invoice</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {customerCreditNotes.map((cn) => (
                              <tr key={cn.id} className="hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <span className="font-mono text-xs font-medium text-red-600">
                                    {cn.creditNoteNumber}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-900">
                                  {format(new Date(cn.creditNoteDate), 'MMM dd, yyyy')}
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-red-600">
                                  -{formatCurrency(cn.amount)}
                                </td>
                                <td className="py-3 px-4 text-gray-700">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                    {cn.reason}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {cn.relatedInvoiceNumber ? (
                                    <span className="font-mono text-xs text-blue-600">
                                      {cn.relatedInvoiceNumber}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-gray-600 text-xs max-w-xs truncate">
                                  {cn.notes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-red-50 border-t-2 border-red-200">
                            <tr>
                              <td colSpan={2} className="py-4 px-4 text-right font-bold text-gray-900">
                                TOTAL CREDIT NOTES:
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-red-700">
                                -{formatCurrency(customerCreditNotes.reduce((sum, cn) => sum + cn.amount, 0))}
                              </td>
                              <td colSpan={3}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Summary Totals */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6 shadow-sm mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Total Invoiced</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0))}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Credit Notes</p>
                        <p className="text-xl font-bold text-red-600">
                          -{formatCurrency(customerCreditNotes.reduce((sum, cn) => sum + cn.amount, 0))}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Net Amount</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(
                            customerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) -
                            customerCreditNotes.reduce((sum, cn) => sum + cn.amount, 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Balance Due</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(selectedCustomer.unpaidAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
            </>
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

        {/* Summary Skeleton */}
        <SkeletonComponents.SkeletonCard />

        {/* Overview Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonComponents.SkeletonCard />
          <SkeletonComponents.SkeletonCard />
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
    <AdminGuard loadingSkeleton={<ReportsLoadingSkeleton />}>
      <ReportsPageContent />
    </AdminGuard>
  );
}
