import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { getBaseUrl } from '@/lib/env-validation';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopCustomer {
  name: string;
  orderCount: number;
  totalSpent: number;
  status: string;
}

interface PaymentStatus {
  name: string;
  value: number;
  percentage: number;
}

export async function POST(request: NextRequest) {
  try {
    const { reportData, reportPeriod, selectedDate } = await request.json();

    if (!reportData) {
      return NextResponse.json({ error: 'Report data is required' }, { status: 400 });
    }

    // Calculate date range for display
    const getDateRangeText = () => {
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
        default:
          return format(selectedDateObj, 'MMMM dd, yyyy');
      }
    };

    const dateRangeText = getDateRangeText();

    // Generate HTML content for the report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Al-Sabil Financial Report</title>
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
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #dc2626;
              padding-bottom: 20px;
            }
            
            .logo {
              margin: 0 auto 15px auto;
              text-align: center;
            }
            
            .logo img {
              max-width: 200px;
              height: auto;
              max-height: 60px;
              object-fit: contain;
            }
            
            .report-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #dc2626;
            }
            
            .report-meta {
              color: #666;
              font-size: 14px;
            }
            
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin: 30px 0;
            }
            
            .summary-card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
            }
            
            .summary-card h3 {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .summary-card .value {
              font-size: 28px;
              font-weight: bold;
              color: #111827;
            }
            
            .summary-card .subtext {
              font-size: 12px;
              color: #9ca3af;
              margin-top: 4px;
            }
            
            .section {
              margin: 40px 0;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #111827;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
            }
            
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            
            .table th,
            .table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .table th {
              background: #f9fafb;
              font-weight: 600;
              color: #374151;
            }
            
            .table tbody tr:hover {
              background: #f9fafb;
            }
            
            .status-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
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
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
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
              <div class="logo">
                <img src="${getBaseUrl()}/logo.png" 
                     alt="Al-Sabil Marketplace" />
              </div>
              <h1 class="report-title">Financial Report</h1>
              <div class="report-meta">
                <div><strong>${reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Report:</strong> ${dateRangeText}</div>
                <div>Generated on: ${format(new Date(), 'MMMM dd, yyyy')}</div>
              </div>
            </div>

            <!-- Summary Cards -->
            <div class="summary-grid">
              <div class="summary-card">
                <h3>Total Revenue</h3>
                <div class="value">$${reportData.totalRevenue.toFixed(2)}</div>
              </div>
              <div class="summary-card">
                <h3>Total Orders</h3>
                <div class="value">${reportData.totalOrders}</div>
                <div class="subtext">${reportData.paidOrders} paid, ${reportData.unpaidOrders} unpaid</div>
              </div>
              <div class="summary-card">
                <h3>Active Customers</h3>
                <div class="value">${reportData.activeCustomers}</div>
                <div class="subtext">of ${reportData.totalCustomers} total</div>
              </div>
              <div class="summary-card">
                <h3>Average Order Value</h3>
                <div class="value">$${reportData.averageOrderValue.toFixed(2)}</div>
              </div>
            </div>

            <!-- Top Products -->
            <div class="section">
              <h2 class="section-title">Top Products</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.topProducts.slice(0, 10).map((product: TopProduct) => `
                    <tr>
                      <td>${product.name}</td>
                      <td>${product.quantity}</td>
                      <td>$${product.revenue.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Top Customers -->
            <div class="section">
              <h2 class="section-title">Top Customers</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Total Orders</th>
                    <th>Total Spent</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.topCustomers.slice(0, 10).map((customer: TopCustomer) => {
                    const status = customer.status === 'Fully Paid' ? 'good' : 'warning';
                    return `
                      <tr>
                        <td>${customer.name}</td>
                        <td>${customer.orderCount}</td>
                        <td>$${customer.totalSpent.toFixed(2)}</td>
                        <td>
                          <span class="status-badge status-${status}">
                            ${customer.status}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Payment Analysis -->
            <div class="section">
              <h2 class="section-title">Payment Status Breakdown</h2>
              <table class="table">
                <thead>
                  <tr>
                    <th>Payment Status</th>
                    <th>Amount</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.paymentStatus.map((status: PaymentStatus) => `
                    <tr>
                      <td>${status.name}</td>
                      <td>$${status.value.toFixed(2)}</td>
                      <td>${status.percentage.toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div>Al-Sabil Marketplace - Financial Report</div>
              <div>This report was generated automatically on ${format(new Date(), 'PPpp')}</div>
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
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    await browser.close();

    const fileName = `al-sabil-report-${reportPeriod}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    // Return PDF as response for inline viewing
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error generating report PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}
