"use client";

import React, { useState } from 'react';
import { Order, OrderItem } from '@/types/cart';
import { Customer } from '@/types/customer';
import { FiEye } from 'react-icons/fi';
import Image from 'next/image';

interface InvoiceProps {
  order: Order;
  customer: Customer;
  invoiceNumber: string;
  companyInfo?: {
    name: string;
    address: string;
    addressLine2?: string;
    phone: string;
    email: string;
    vatNo?: string;
    companyNo?: string;
    iban?: string;
    bicSwift?: string;
  };
}

const Invoice: React.FC<InvoiceProps> = ({ 
  order, 
  customer, 
  invoiceNumber,
  companyInfo = {
    name: "AL SABIL MARKETPLACE LTD",
    address: "2 PORTERS ROAD",
    addressLine2: "COOLMINE IND EST., BLANCHARDSTOWN, DUBLIN 15, D15 PC9Y",
    phone: "+353 89 954 5897",
    email: "alsabilmarketplace@gmail.com",
    vatNo: "2682343H",
    companyNo: "739842",
    iban: "IE38REVO99036064327348",
    bicSwift: "REVOIE23"
  }
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

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

  const previewInvoice = async () => {
    try {
      setIsGenerating(true);
      
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      // Get the PDF blob and open in new tab
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalAmount = order.total || (order.subtotal + order.deliveryFee);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Download Button */}
      <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Invoice Preview</h3>
          <button
            onClick={previewInvoice}
            disabled={isGenerating}
            className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <FiEye className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Preview PDF'}
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div 
        className="p-4 sm:p-6 lg:p-8 bg-white"
        style={{ 
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#333'
        }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6 sm:mb-8">
          <div className="flex flex-col items-start">
            <Image
              src="/logo.png"
              alt="Al-Sabil Logo"
              width={100}
              height={100}
              className="object-contain mb-3 sm:w-[124px] sm:h-[124px]"
              priority
            />
            <div className="text-xs sm:text-sm space-y-0.5">
              <p className="font-bold text-sm sm:text-base">{companyInfo.name}</p>
              <p className="font-semibold">{companyInfo.address}</p>
              {companyInfo.addressLine2 && <p>{companyInfo.addressLine2}</p>}
              <p className="mt-1">Telephone {companyInfo.phone}</p>
              {companyInfo.vatNo && <p>VAT No: {companyInfo.vatNo}</p>}
              {companyInfo.companyNo && <p>Registered Company No: {companyInfo.companyNo}</p>}
            </div>
          </div>
          
          <div className="w-full sm:w-auto text-left sm:text-right">
            <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-3">INVOICE</h2>
            <div className="text-xs sm:text-sm space-y-0.5 mb-4">
              {companyInfo.iban && (
                <p className="font-semibold">IBAN: {companyInfo.iban}</p>
              )}
              {companyInfo.bicSwift && (
                <p className="font-semibold">BIC/SWIFT: {companyInfo.bicSwift}</p>
              )}
            </div>
            <div className="text-xs sm:text-sm space-y-1">
              <p><strong>Invoice #:</strong> {invoiceNumber}</p>
              <p><strong>Date:</strong> {formatDate(order.createdAt)}</p>
              <p><strong>Due Date:</strong> {formatDate(dueDate.toISOString())}</p>
              <p><strong>Order #:</strong> {order.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 sm:mb-8">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="font-semibold text-base sm:text-lg">{customer.businessName}</p>
              <p className="text-gray-700 text-sm sm:text-base">{customer.contactPerson}</p>
              <p className="text-gray-700 text-sm sm:text-base break-all">{customer.email}</p>
              {customer.phone && <p className="text-gray-700 text-sm sm:text-base">{customer.phone}</p>}
              <p className="text-gray-700 mt-2 text-sm sm:text-base">{customer.address}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Ship To:</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-gray-700 text-sm sm:text-base">{order.deliveryAddress || customer.address}</p>
              {order.deliveryDate && (
                <p className="text-gray-700 mt-2 text-sm sm:text-base">
                  <strong>Delivery Date:</strong> {formatDate(order.deliveryDate)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 sm:mb-8 overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 min-w-[600px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-xs sm:text-sm">Item</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-xs sm:text-sm">Unit</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-xs sm:text-sm">Qty</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-xs sm:text-sm">Unit Price</th>
                <th className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-xs sm:text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: OrderItem, index: number) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{item.name}</td>
                  <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm">{item.unit}</td>
                  <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm">{item.quantity}</td>
                  <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm">{formatCurrency(item.price)}</td>
                  <td className="border border-gray-300 px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold text-xs sm:text-sm">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-6 sm:mb-8">
          <div className="w-full sm:w-80">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200 text-sm sm:text-base">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
              </div>
              
              {order.deliveryFee > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm sm:text-base">
                  <span className="text-gray-700">Delivery Fee:</span>
                  <span className="font-semibold">{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}

              {order.originalTotal && order.originalTotal !== order.total && (
                <div className="flex justify-between py-2 border-b border-gray-200 text-sm sm:text-base">
                  <span className="text-gray-700">Original Total:</span>
                  <span className="font-semibold">{formatCurrency(order.originalTotal)}</span>
                </div>
              )}

              {order.creditNotes && order.creditNotes.length > 0 && (
                <div className="border-b border-gray-200 pb-2">
                  <div className="flex justify-between py-2 text-sm sm:text-base">
                    <span className="text-gray-700 font-semibold">Credit Notes Applied:</span>
                    <span className="font-semibold text-orange-600">-{formatCurrency(order.totalCreditNotes || 0)}</span>
                  </div>
                  <div className="pl-4 space-y-1">
                    {order.creditNotes.map((creditNote) => (
                      <div key={creditNote.id} className="text-xs text-gray-600">
                        <span className="capitalize">Reason: {creditNote.reason.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between py-3 border-t-2 border-gray-400 bg-gray-50 px-3 sm:px-4 rounded">
                <span className="text-lg sm:text-xl font-bold text-gray-900">Total Amount:</span>
                <span className="text-lg sm:text-xl font-bold text-red-600">{formatCurrency(totalAmount)}</span>
              </div>

              {order.totalPaid > 0 && (
                <div className="flex justify-between py-2 px-3 sm:px-4 text-sm sm:text-base">
                  <span className="text-green-600 font-bold">Amount Paid:</span>
                  <span className="text-green-600 font-bold">{formatCurrency(order.totalPaid)}</span>
                </div>
              )}

              {order.remainingAmount > 0 && (
                <div className="flex justify-between py-2 px-3 sm:px-4 text-sm sm:text-base">
                  <span className="text-red-600 font-bold">Amount Due:</span>
                  <span className="text-red-600 font-bold">{formatCurrency(order.remainingAmount)}</span>
                </div>
              )}

              {order.paymentStatus === 'paid' && order.totalPaid > 0 && (
                <div className="mt-2 p-3 bg-green-100 border border-green-500 rounded text-green-700 text-center font-bold text-xs sm:text-sm">
                  ✓ PAID IN FULL
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 sm:mb-8">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
              <p><strong>Payment Method:</strong> {order.paymentMethod === 'credit' ? 'Credit Account' : 'Cash on Delivery'}</p>
              <p><strong>Payment Status:</strong> <span className="capitalize">{order.paymentStatus}</span></p>
              <p><strong>Payment Terms:</strong> Net 30 days</p>
              {order.paymentMethod === 'credit' && order.paymentStatus === 'pending' && (
                <p className="text-red-600 font-semibold mt-2">
                  Payment due by: {formatDate(dueDate.toISOString())}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Order Status</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
              <p><strong>Current Status:</strong> <span className="capitalize">{order.status}</span></p>
              <p><strong>Order Date:</strong> {formatDate(order.createdAt)}</p>
              {order.deliveryDate && (
                <p><strong>Expected Delivery:</strong> {formatDate(order.deliveryDate)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Delivery Notes</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="text-gray-700 text-xs sm:text-sm">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 sm:pt-6">
          <div className="text-center text-xs sm:text-sm text-gray-600">
            <p>Thank you for your business!</p>
            <p className="mt-2">
              For questions about this invoice, please contact us at {companyInfo.email} or {companyInfo.phone}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
