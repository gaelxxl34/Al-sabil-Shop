import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getBaseUrl } from '@/lib/env-validation';
import { Order } from '@/types/cart';
import { Customer } from '@/types/customer';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { orderId } = await request.json();

    // Get order data
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = { id: orderDoc.id, ...orderDoc.data() } as Order;

    // Get customer data
    const customerDoc = await adminDb.collection('customers').doc(order.customerId).get();
    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;

    // Generate invoice number
    const generateInvoiceNumber = (order: Order) => {
      const date = new Date(order.createdAt);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const orderSuffix = order.id.slice(-6).toUpperCase();
      return `INV-${year}${month}-${orderSuffix}`;
    };

    const invoiceNumber = generateInvoiceNumber(order);

    // Company info
    const companyInfo = {
      name: "Al-Sabil Wholesale",
      address: "123 Business Street, City, Country",
      phone: "+31 20 123 4567",
      email: "orders@al-sabil.com",
      taxId: "NL123456789B01"
    };

    // Format functions
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    };

    const totalAmount = order.total || (order.subtotal + order.deliveryFee);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Generate HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoiceNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              color: #333;
              background: white;
              padding: 20px;
            }
            
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
            }
            
            .logo-section img {
              width: 120px;
              height: 120px;
              object-fit: contain;
              margin-bottom: 8px;
            }
            
            .company-details {
              font-size: 12px;
              color: #666;
              line-height: 1.4;
            }
            
            .invoice-section {
              text-align: right;
            }
            
            .invoice-title {
              font-size: 36px;
              font-weight: bold;
              color: #dc2626;
              margin-bottom: 8px;
            }
            
            .invoice-details {
              font-size: 12px;
              line-height: 1.4;
            }
            
            .bill-to-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 30px;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 12px;
            }
            
            .address-box {
              background: #f9fafb;
              padding: 16px;
              border-radius: 8px;
            }
            
            .business-name {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 4px;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            
            .items-table th,
            .items-table td {
              border: 1px solid #d1d5db;
              padding: 12px;
              text-align: left;
            }
            
            .items-table th {
              background: #f3f4f6;
              font-weight: bold;
            }
            
            .items-table .text-center { text-align: center; }
            .items-table .text-right { text-align: right; }
            
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 30px;
            }
            
            .totals-table {
              width: 320px;
            }
            
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            
            .totals-total {
              display: flex;
              justify-content: space-between;
              padding: 12px 16px;
              background: #f9fafb;
              border-radius: 8px;
              border-top: 2px solid #6b7280;
              font-weight: bold;
              font-size: 18px;
            }
            
            .totals-total .amount {
              color: #dc2626;
            }
            
            .info-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 30px;
            }
            
            .info-box {
              background: #f9fafb;
              padding: 16px;
              border-radius: 8px;
              font-size: 12px;
            }
            
            .notes-section {
              margin-bottom: 30px;
            }
            
            .notes-box {
              background: #f9fafb;
              padding: 16px;
              border-radius: 8px;
            }
            
            .footer {
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #d1d5db;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="${getBaseUrl()}/logo.png" alt="Al-Sabil Logo" />
              <div class="company-details">
                <div>${companyInfo.address}</div>
                <div>Phone: ${companyInfo.phone}</div>
                <div>Email: ${companyInfo.email}</div>
              </div>
            </div>
            
            <div class="invoice-section">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-details">
                <div><strong>Invoice #:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${formatDate(order.createdAt)}</div>
                <div><strong>Due Date:</strong> ${formatDate(dueDate.toISOString())}</div>
                <div><strong>Order #:</strong> ${order.id.slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>

          <div class="bill-to-section">
            <div>
              <div class="section-title">Bill To:</div>
              <div class="address-box">
                <div class="business-name">${customer.businessName}</div>
                <div>${customer.contactPerson}</div>
                <div>${customer.email}</div>
                ${customer.phone ? `<div>${customer.phone}</div>` : ''}
                <div style="margin-top: 8px;">${customer.address}</div>
              </div>
            </div>
            
            <div>
              <div class="section-title">Ship To:</div>
              <div class="address-box">
                <div>${order.deliveryAddress || customer.address}</div>
                ${order.deliveryDate ? `<div style="margin-top: 8px;"><strong>Delivery Date:</strong> ${formatDate(order.deliveryDate)}</div>` : ''}
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Unit</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, index) => `
                <tr style="background: ${index % 2 === 0 ? 'white' : '#f9fafb'};">
                  <td>${item.name}</td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${formatCurrency(item.price)}</td>
                  <td class="text-right"><strong>${formatCurrency(item.total)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-table">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span><strong>${formatCurrency(order.subtotal)}</strong></span>
              </div>
              ${order.deliveryFee > 0 ? `
                <div class="totals-row">
                  <span>Delivery Fee:</span>
                  <span><strong>${formatCurrency(order.deliveryFee)}</strong></span>
                </div>
              ` : ''}
              <div class="totals-total">
                <span>Total Amount:</span>
                <span class="amount">${formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div class="info-section">
            <div>
              <div class="section-title">Payment Information</div>
              <div class="info-box">
                <div><strong>Payment Method:</strong> ${order.paymentMethod === 'credit' ? 'Credit Account' : 'Cash on Delivery'}</div>
                <div><strong>Payment Status:</strong> ${order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}</div>
                <div><strong>Payment Terms:</strong> Net 30 days</div>
                ${order.paymentMethod === 'credit' && order.paymentStatus === 'pending' ? `
                  <div style="color: #dc2626; font-weight: bold; margin-top: 8px;">
                    Payment due by: ${formatDate(dueDate.toISOString())}
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div>
              <div class="section-title">Order Status</div>
              <div class="info-box">
                <div><strong>Current Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</div>
                <div><strong>Order Date:</strong> ${formatDate(order.createdAt)}</div>
                ${order.deliveryDate ? `<div><strong>Expected Delivery:</strong> ${formatDate(order.deliveryDate)}</div>` : ''}
              </div>
            </div>
          </div>

          ${order.notes ? `
            <div class="notes-section">
              <div class="section-title">Delivery Notes</div>
              <div class="notes-box">
                ${order.notes}
              </div>
            </div>
          ` : ''}

          <div class="footer">
            <div>Thank you for your business!</div>
            <div style="margin-top: 8px;">
              For questions about this invoice, please contact us at ${companyInfo.email} or ${companyInfo.phone}
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

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice-${invoiceNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
