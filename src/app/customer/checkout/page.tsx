"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiShoppingCart, FiArrowLeft, FiCreditCard, FiUser, FiMapPin, FiCalendar, FiFileText, FiCheck, FiLoader } from "react-icons/fi";
import { logout } from "@/lib/auth";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { orderApi, customerApi } from "@/lib/api-client";
import CustomerHeader from "@/components/CustomerHeader";
import CustomerMobileNav from "@/components/CustomerMobileNav";
import CustomerPageSkeleton from "@/components/CustomerPageSkeleton";
import ProductImage from "@/components/ProductImage";

interface CustomerDisplayData {
  id: string;
  name: string;
  email: string;
  address: string;
  sellerId: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { state, clearCart, getCartSummary, getItemCount, isHydrated } = useCart();
  const { showToast } = useToast();
  const [customerData, setCustomerData] = useState<CustomerDisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credit' | 'cash'>('credit');

  const cartSummary = getCartSummary();
  const itemCount = getItemCount();

  const fetchCustomerData = useCallback(async () => {
    try {
      setIsLoading(true);
      const customerResponse = await customerApi.getMe();
      const customer = customerResponse.data.customer;
      
      // Transform Customer to CustomerDisplayData
      setCustomerData({
        id: customer.id,
        name: customer.businessName || '',
        email: customer.email || '',
        address: customer.address || '',
        sellerId: customer.sellerId || '',
      });
    } catch (error: unknown) {
      console.error('Error fetching customer:', error);
      // Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Redirect to cart if no items
    if (isHydrated && state.items.length === 0) {
      router.push('/customer/cart');
      return;
    }

    if (isHydrated) {
      fetchCustomerData();
    }
  }, [isHydrated, state.items.length, fetchCustomerData, router]);

  const handlePlaceOrder = async () => {
    if (!customerData || state.items.length === 0) return;
    
    setIsPlacingOrder(true);
    try {
      // Get first item name for user-friendly messages
      const firstItemName = state.items[0]?.name || 'items';
      const itemCount = state.items.length;
      const orderDescription = itemCount > 1 
        ? `${firstItemName} and ${itemCount - 1} other item${itemCount > 2 ? 's' : ''}`
        : firstItemName;

      // Create order data
      const orderData = {
        customerId: customerData.id,
        sellerId: customerData.sellerId,
        items: state.items.map((item: {
          id: string;
          productId: string;
          name: string;
          unit: string;
          quantity: number;
          price: number;
        }) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        deliveryAddress: customerData.address || '',
        paymentMethod: selectedPaymentMethod,
        notes: deliveryNotes,
        subtotal: cartSummary.subtotal,
        // Don't send deliveryFee - let API calculate it
      };

      // Create the order
      const orderResponse = await orderApi.createOrder(orderData);
      const orderId = orderResponse.data.id;
      const orderNumber = `#${orderId.slice(-6).toUpperCase()}`;
      
      // Show success message with user-friendly details
      showToast({
        type: 'success',
        title: 'Order Placed Successfully!',
        message: `Your order for ${orderDescription} (${orderNumber}) has been placed and will be processed soon.`,
        duration: 8000,
        action: {
          label: 'View Order',
          onClick: () => router.push(`/customer/orders/${orderId}`)
        }
      });

      clearCart();
      
      // Navigate to orders page after a short delay to let the user see the toast
      setTimeout(() => {
        router.push('/customer/orders');
      }, 2000);
      
    } catch (error: unknown) {
      console.error('Order placement error:', error);
      
      const errorObj = error as { code?: number; response?: { status: number } };
      if (errorObj.code === 401 || errorObj.response?.status === 401) {
        await logout(router);
        return;
      }
      
      const errorMessage = (error as { message?: string }).message || 'There was an error processing your order. Please try again.';
      
      showToast({
        type: 'error',
        title: 'Order Failed',
        message: errorMessage,
        duration: 8000,
        action: {
          label: 'Try Again',
          onClick: () => handlePlaceOrder()
        }
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Show loading skeleton while loading or not hydrated
  if (!isHydrated || isLoading) {
    return (
      <CustomerPageSkeleton
        showTitle={true}
        titleIcon={<FiShoppingCart />}
        titleDescription="Review your order before placing it"
        contentType="cart"
      />
    );
  }

  // Redirect if no items (shouldn't happen due to useEffect, but safety check)
  if (state.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <CustomerHeader 
        currentPage="cart"
        showCartButton={false}
        customActions={
          <Link 
            href="/customer/cart" 
            className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Cart
          </Link>
        }
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FiCheck className="text-green-600" />
            Order Confirmation
          </h1>
          <p className="text-gray-600">Review your order details before placing your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            {customerData && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiUser className="text-blue-600" />
                  Customer Information
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-gray-900 font-medium">{customerData.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{customerData.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <FiMapPin className="w-4 h-4" />
                      Delivery Address
                    </label>
                    <p className="text-gray-900">{customerData.address || 'No address provided'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FiShoppingCart className="text-red-600" />
                  Order Items ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {state.items.map((item) => (
                  <div key={item.id} className="p-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="shrink-0">
                        <ProductImage
                          imageBase64={item.imageBase64}
                          category={item.category || 'beef'}
                          name={item.name || 'Product'}
                          size="lg"
                          className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shadow-sm"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">{item.name}</h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-red-600">€{item.price.toFixed(2)}</span>
                            <span className="text-sm text-gray-500">per {item.unit}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            <p className="text-lg font-bold text-gray-900">€{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Notes */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiFileText className="text-green-600" />
                Delivery Notes (Optional)
              </h2>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Add any special instructions for delivery..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiCreditCard className="text-purple-600" />
                Payment Method
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit"
                    checked={selectedPaymentMethod === 'credit'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value as 'credit')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <FiCreditCard className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Credit Account</p>
                    <p className="text-sm text-gray-600">Pay using your store credit account</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={selectedPaymentMethod === 'cash'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value as 'cash')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="w-5 h-5 text-center text-gray-600">💵</span>
                  <div>
                    <p className="font-medium text-gray-900">Cash on Delivery</p>
                    <p className="text-sm text-gray-600">Pay with cash when your order is delivered</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary & Place Order */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({itemCount} items)</span>
                  <span className="font-medium text-gray-900">€{cartSummary.subtotal.toFixed(2)}</span>
                </div>
                
                {cartSummary.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-medium text-gray-900">€{cartSummary.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-xl font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-red-600">€{cartSummary.finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || !customerData}
                  className="w-full bg-elegant-red-600 text-white py-4 px-6 rounded-lg hover:bg-elegant-red-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlacingOrder ? (
                    <>
                      <FiLoader className="w-5 h-5 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5" />
                      Place Order
                    </>
                  )}
                </button>
                
                <Link 
                  href="/customer/cart"
                  className="w-full text-center text-gray-600 hover:text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors block"
                >
                  Back to Cart
                </Link>
              </div>

              {/* Order Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Order Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    <span>Estimated delivery: 1-2 business days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCreditCard className="w-4 h-4" />
                    <span>Payment: {selectedPaymentMethod === 'credit' ? 'Credit Account' : 'Cash on Delivery'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CustomerMobileNav currentPage="cart" />
    </div>
  );
}
