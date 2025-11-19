import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { getBaseUrl } from '@/lib/env-validation';

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

export async function POST(request: NextRequest) {
  try {
    const { customer, invoices, creditNotes, reportDate, reportPeriod, selectedDate, customStartDate, customEndDate } = await request.json() as {
      customer: CustomerPaymentStatus;
      invoices: CustomerInvoiceDetail[];
      creditNotes: CreditNoteDetail[];
      reportDate: string;
      reportPeriod?: 'daily' | 'weekly' | 'monthly' | 'annually' | 'custom';
      selectedDate?: string;
      customStartDate?: string;
      customEndDate?: string;
    };

    if (!customer) {
      return NextResponse.json({ error: 'Customer data is required' }, { status: 400 });
    }

    // Function to get date range text
    const getDateRangeText = () => {
      if (reportPeriod === 'custom' && customStartDate && customEndDate) {
        const startDateObj = new Date(customStartDate);
        const endDateObj = new Date(customEndDate);
        return `${format(startDateObj, 'MMM dd, yyyy')} - ${format(endDateObj, 'MMM dd, yyyy')}`;
      }
      
      if (selectedDate) {
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
      }
      
      return 'All Time';
    };

    const periodLabel = reportPeriod ? reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1) : 'All Time';
    const dateRangeText = getDateRangeText();

    // Calculate totals
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0);
    const totalCreditNotes = creditNotes.reduce((sum, cn) => sum + cn.amount, 0);
    const netAmount = totalInvoiced - totalCreditNotes;

    const formatCurrency = (value: number) => `€${value.toFixed(2)}`;

    // Company info (Al-Sabil details from Invoice component)
    const companyInfo = {
      name: "AL SABIL MARKETPLACE LTD",
      address: "2 PORTERS ROAD",
      addressLine2: "COOLMINE IND EST., BLANCHARDSTOWN, DUBLIN 15, D15 PC9Y",
      phone: "+353 89 954 5897",
      email: "alsabilmarketplace@gmail.com",
      vatNo: "2682343H",
      companyNo: "739842",
      iban: "IE38REVO99036064327348",
      bicSwift: "REVOIE23"
    };

    // Create a unified activity list with invoices and credit notes
    interface ActivityItem {
      date: string;
      type: 'invoice' | 'credit_note' | 'payment';
      invoiceNumber: string;
      description: string;
      payment: number;
      amount: number;
      relatedInvoice?: string;
    }

    const activities: ActivityItem[] = [];

    // Add invoices
    invoices.forEach(inv => {
      activities.push({
        date: inv.invoiceDate,
        type: 'invoice',
        invoiceNumber: inv.invoiceNumber,
        description: `Invoice ${inv.invoiceNumber}`,
        payment: 0,
        amount: inv.totalAmount
      });

      // Add payment if any
      if (inv.paidAmount > 0) {
        activities.push({
          date: inv.invoiceDate,
          type: 'payment',
          invoiceNumber: inv.invoiceNumber,
          description: 'Payment Received',
          payment: inv.paidAmount,
          amount: 0
        });
      }
    });

    // Add credit notes - show under related invoice or as separate line
    creditNotes.forEach(cn => {
      activities.push({
        date: cn.creditNoteDate,
        type: 'credit_note',
        invoiceNumber: cn.relatedInvoiceNumber || cn.creditNoteNumber,
        description: `Credit Note - ${cn.reason}`,
        payment: 0,
        amount: -cn.amount,
        relatedInvoice: cn.relatedInvoiceNumber
      });
    });

    // Sort by date
    activities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const activitiesWithBalance = activities.map(activity => {
      runningBalance += activity.amount - activity.payment;
      return {
        ...activity,
        balance: runningBalance
      };
    });

    // Generate HTML content for the customer report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Customer Statement - ${customer.name}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              background: #fff;
            }
            
            .container {
              max-width: 900px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: start;
              margin-bottom: 30px;
              border-bottom: 3px solid #dc2626;
              padding-bottom: 20px;
            }
            
            .logo-section {
              flex: 1;
            }
            
            .logo img {
              max-width: 180px;
              height: auto;
              max-height: 60px;
              object-fit: contain;
            }
            
            .seller-details {
              text-align: left;
              margin-top: 10px;
              font-size: 12px;
              color: #666;
            }
            
            .report-info {
              text-align: right;
              flex: 1;
            }
            
            .report-title {
              font-size: 24px;
              font-weight: bold;
              color: #dc2626;
              margin-bottom: 5px;
            }
            
            .report-subtitle {
              font-size: 14px;
              color: #666;
              margin-bottom: 10px;
            }
            
            .customer-info {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            
            .customer-info h3 {
              font-size: 16px;
              color: #111827;
              margin-bottom: 10px;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 5px;
            }
            
            .customer-info p {
              font-size: 13px;
              color: #4b5563;
              margin: 5px 0;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin: 25px 0;
            }
            
            .summary-card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 15px;
              text-align: center;
            }
            
            .summary-card h4 {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .summary-card .value {
              font-size: 20px;
              font-weight: bold;
              color: #111827;
            }
            
            .summary-card.highlight {
              background: #fef2f2;
              border-color: #fecaca;
            }
            
            .summary-card.highlight .value {
              color: #dc2626;
            }
            
            .summary-card.positive {
              background: #f0fdf4;
              border-color: #bbf7d0;
            }
            
            .summary-card.positive .value {
              color: #16a34a;
            }
            
            .section {
              margin: 30px 0;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #111827;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
            }
            
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 11px;
              border: 1px solid #d1d5db;
            }
            
            .table th {
              background: #f9fafb;
              font-weight: 600;
              color: #374151;
              padding: 10px 8px;
              text-align: left;
              border: 1px solid #d1d5db;
            }
            
            .table td {
              padding: 10px 8px;
              border: 1px solid #e5e7eb;
            }
            
            .table tbody tr:hover {
              background: #f9fafb;
            }
            
            .table tfoot {
              background: #f3f4f6;
              font-weight: bold;
            }
            
            .table tfoot td {
              border-top: 2px solid #9ca3af;
              padding: 12px 8px;
            }
            
            .text-right {
              text-align: right;
            }
            
            .text-center {
              text-align: center;
            }
            
            .badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 500;
            }
            
            .badge-paid {
              background: #dcfce7;
              color: #166534;
            }
            
            .badge-partial {
              background: #fef3c7;
              color: #92400e;
            }
            
            .badge-unpaid {
              background: #fee2e2;
              color: #991b1b;
            }
            
            .badge-credit {
              background: #fef2f2;
              color: #dc2626;
            }
            
            .credit-amount {
              color: #dc2626;
              font-weight: 600;
            }
            
            .invoice-number {
              font-family: 'Courier New', monospace;
              font-size: 10px;
              color: #2563eb;
            }
            
            .credit-number {
              font-family: 'Courier New', monospace;
              font-size: 10px;
              color: #dc2626;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 11px;
            }
            
            .account-status {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 13px;
            }
            
            .status-good {
              background: #dcfce7;
              color: #166534;
            }
            
            .status-warning {
              background: #fef3c7;
              color: #92400e;
            }
            
            .status-overdue {
              background: #fee2e2;
              color: #991b1b;
            }
            
            @media print {
              .container {
                max-width: none;
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="logo-section">
                <div class="logo">
                  <img src="${getBaseUrl()}/logo.png" alt="Al-Sabil Marketplace" />
                </div>
                <div class="seller-details">
                  <strong>${companyInfo.name}</strong><br>
                  ${companyInfo.address}<br>
                  ${companyInfo.addressLine2}<br>
                  <strong>Phone:</strong> ${companyInfo.phone}<br>
                  <strong>Email:</strong> ${companyInfo.email}<br>
                  <strong>VAT No:</strong> ${companyInfo.vatNo} | <strong>Company No:</strong> ${companyInfo.companyNo}
                </div>
              </div>
              <div class="report-info">
                <h1 class="report-title">Customer Statement</h1>
                <div class="report-subtitle">Account Activity Report</div>
                <div style="font-size: 12px; color: #666; margin-top: 10px;">
                  <div><strong>Statement Date:</strong> ${format(new Date(reportDate), 'MMMM dd, yyyy')}</div>
                  <div><strong>Period:</strong> ${periodLabel} (${dateRangeText})</div>
                  <div style="margin-top: 5px;">
                    <span class="account-status status-${customer.status}">
                      ${customer.status === 'good' ? 'Good Standing' : customer.status === 'warning' ? 'Payment Due' : 'Overdue'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Customer Information -->
            <div class="customer-info">
              <h3>Customer Details</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <p><strong>Business Name:</strong> ${customer.name}</p>
                  <p><strong>Email:</strong> ${customer.email}</p>
                </div>
                <div>
                  <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
                  <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
                </div>
              </div>
            </div>

            <!-- Account Activity Table -->
            <div class="section">
              <h2 class="section-title">Account Activity</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th class="text-right">Payment</th>
                    <th class="text-right">Amount</th>
                    <th class="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${activitiesWithBalance.map((activity) => `
                    <tr>
                      <td>${format(new Date(activity.date), 'M/d/yy')}</td>
                      <td><span class="${activity.type === 'credit_note' ? 'credit-number' : 'invoice-number'}">${activity.invoiceNumber}</span></td>
                      <td class="text-right">${activity.payment > 0 ? formatCurrency(activity.payment) : ''}</td>
                      <td class="text-right">${activity.amount !== 0 ? formatCurrency(Math.abs(activity.amount)) : ''}</td>
                      <td class="text-right"><strong>${formatCurrency(activity.balance)}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" class="text-right"><strong>Current Balance:</strong></td>
                    <td class="text-right"><strong style="font-size: 16px;">${formatCurrency(runningBalance)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Account Summary -->
            <div class="section">
              <h2 class="section-title">Account Summary</h2>
              <table class="table">
                <tbody>
                  <tr>
                    <td><strong>Total Invoiced</strong></td>
                    <td class="text-right">${formatCurrency(totalInvoiced)}</td>
                  </tr>
                  <tr>
                    <td><strong>Less: Credit Notes</strong></td>
                    <td class="text-right credit-amount">-${formatCurrency(totalCreditNotes)}</td>
                  </tr>
                  <tr style="background: #f9fafb;">
                    <td><strong>Net Amount</strong></td>
                    <td class="text-right"><strong>${formatCurrency(netAmount)}</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Total Paid</strong></td>
                    <td class="text-right" style="color: #16a34a;">${formatCurrency(totalPaid)}</td>
                  </tr>
                  <tr style="background: ${totalOutstanding > 0 ? '#fef2f2' : '#f0fdf4'};">
                    <td><strong>Balance Due</strong></td>
                    <td class="text-right" style="font-size: 18px; color: ${totalOutstanding > 0 ? '#dc2626' : '#16a34a'};"><strong>${formatCurrency(totalOutstanding)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div><strong>${companyInfo.name}</strong> - Customer Statement</div>
              <div>This statement was generated on ${format(new Date(), 'PPpp')}</div>
              <div style="margin-top: 10px; color: #9ca3af;">
                For questions about this statement, please contact us at ${companyInfo.email}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });

    await browser.close();

    const fileName = `${customer.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-statement-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    // Return PDF as response for inline viewing
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error generating customer report PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate customer report PDF' },
      { status: 500 }
    );
  }
}
