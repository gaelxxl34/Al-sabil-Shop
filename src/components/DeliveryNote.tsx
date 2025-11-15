"use client";

import React, { useState } from 'react';
import { Order, OrderItem } from '@/types/cart';
import { Customer } from '@/types/customer';
import { FiPrinter } from 'react-icons/fi';
import Image from 'next/image';

interface DeliveryNoteProps {
  order: Order;
  customer: Customer;
  deliveryNoteNumber: string;
  companyInfo?: {
    name: string;
    address: string;
    addressLine2?: string;
    phone: string;
    email: string;
    vatNo?: string;
    companyNo?: string;
  };
}

const DeliveryNote: React.FC<DeliveryNoteProps> = ({ 
  order, 
  customer, 
  deliveryNoteNumber,
  companyInfo = {
    name: "AL SABIL MARKETPLACE LTD",
    address: "2 PORTERS ROAD",
    addressLine2: "COOLMINE IND EST., BLANCHARDSTOWN, DUBLIN 15, D15 PC9Y",
    phone: "+353 89 954 5897",
    email: "alsabilmarketplace@gmail.com",
    vatNo: "2682343H",
    companyNo: "739842"
  }
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    // Wait a bit for state update, then trigger print
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const calculateTotalWeight = () => {
    return order.items.reduce((total, item) => {
      // If unit is kg, add quantity directly. If unit contains 'g' or 'kg', parse it
      if (item.unit.toLowerCase().includes('kg')) {
        return total + item.quantity;
      }
      return total;
    }, 0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Print Button */}
      <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200 print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Delivery Note Preview</h3>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <FiPrinter className="w-4 h-4" />
            {isPrinting ? 'Preparing...' : 'Print Delivery Note'}
          </button>
        </div>
      </div>

      {/* Delivery Note Content */}
      <div 
        id="delivery-note-content"
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
              <p>{companyInfo.email}</p>
              {companyInfo.vatNo && <p>VAT No: {companyInfo.vatNo}</p>}
              {companyInfo.companyNo && <p>Registered Company No: {companyInfo.companyNo}</p>}
            </div>
          </div>
          
          <div className="w-full sm:w-auto text-left sm:text-right">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-3">DELIVERY NOTE</h2>
            <div className="text-xs sm:text-sm space-y-1">
              <p><strong>Delivery Note #:</strong> {deliveryNoteNumber}</p>
              <p><strong>Date:</strong> {formatDate(order.createdAt)}</p>
              {order.deliveryDate && (
                <p><strong>Delivery Date:</strong> {formatDate(order.deliveryDate)}</p>
              )}
              <p><strong>Order #:</strong> {order.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Deliver To:</h3>
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <p className="text-sm">
              <span className="font-semibold">{customer.businessName}</span>
              {customer.contactPerson && <span> - {customer.contactPerson}</span>}
              {customer.phone && <span> - {customer.phone}</span>}
              <span> - {order.deliveryAddress || customer.address}</span>
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Product Details:</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Item Description</th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-20">Unit</th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm w-24">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: OrderItem, index: number) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.name}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.unit}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-base">{item.quantity}</td>
                  </tr>
                ))}
                {/* Total Net Weight Row */}
                <tr className="bg-gray-100 font-semibold">
                  <td className="border border-gray-300 px-3 py-2 text-sm text-right" colSpan={2}>
                    Total Net Weight:
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-bold text-base">
                    {calculateTotalWeight().toFixed(2)} kg
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Notes */}
        {order.notes && (
          <div className="mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Special Instructions:</h3>
            <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
              <p className="text-gray-700 text-xs sm:text-sm">{order.notes}</p>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="border-t-2 border-gray-300 pt-3 mt-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 mb-4">
            <p className="text-xs sm:text-sm text-blue-900 font-semibold mb-2">
              Storage and Handling Instructions:
            </p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Keep refrigerated at all times - maintain temperature between 0°C to 4°C (32°F to 39°F)</li>
              <li>Store meat products separately from other items</li>
              <li>Check all items for quantity and condition upon delivery</li>
              <li>Report any discrepancies or damages immediately</li>
            </ul>
          </div>
          
          <div className="text-center text-xs sm:text-sm text-gray-600">
            <p>Thank you for your business!</p>
            <p className="mt-2">
              For questions or issues with this delivery, please contact us at {companyInfo.email} or {companyInfo.phone}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #delivery-note-content {
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          #delivery-note-content,
          #delivery-note-content * {
            visibility: visible;
          }
          #delivery-note-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-height: 100vh;
          }
          @page {
            margin: 0.75cm;
            size: A4 portrait;
          }
          /* Prevent page breaks inside important elements */
          table, .border-t-2 {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DeliveryNote;
