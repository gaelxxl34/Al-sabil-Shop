// src/app/customer/cart/page.tsx
// Customer Cart: Review items, adjust quantities, and proceed to checkout

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiArrowLeft, FiCreditCard } from "react-icons/fi";
import { useCart } from "@/contexts/CartContext";
import CustomerHeader from "@/components/CustomerHeader";
import CustomerMobileNav from "@/components/CustomerMobileNav";
import CustomerPageSkeleton from "@/components/CustomerPageSkeleton";
import ProductImage from "@/components/ProductImage";

export default function CustomerCart() {
  const router = useRouter();
  const { state, removeItem, updateQuantity, clearCart, getCartSummary, getItemCount, isHydrated } = useCart();

  const cartSummary = getCartSummary();
  const itemCount = getItemCount();

  // Don't render cart content until hydrated to prevent flickering
  const shouldShowContent = isHydrated;

  // Show loading skeleton while hydrating
  if (!shouldShowContent) {
    return (
      <CustomerPageSkeleton
        showTitle={true}
        titleIcon={<FiShoppingCart />}
        titleDescription="Review your items and proceed to checkout"
        contentType="cart"
      />
    );
  }

  const handleCheckout = () => {
    if (state.items.length === 0) return;
    
    // Redirect to checkout page for order confirmation
    router.push('/customer/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <CustomerHeader 
        currentPage="cart"
        showCartButton={false}
        customActions={
          <Link 
            href="/customer/dashboard" 
            className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <FiArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        }
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FiShoppingCart className="text-red-700" />
            Shopping Cart
          </h1>
          <p className="text-gray-600">Review your items and proceed to checkout</p>
        </div>

        {!shouldShowContent ? (
          /* Loading State */
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your cart...</p>
          </div>
        ) : state.items.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <div className="text-gray-400 text-8xl mb-6">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Add some delicious products to get started!</p>
            <Link 
              href="/customer/dashboard"
              className="bg-elegant-red-600 text-white px-8 py-3 rounded-lg hover:bg-elegant-red-700 transition-colors font-semibold inline-flex items-center gap-2"
            >
              <FiArrowLeft className="w-5 h-5" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Cart Items ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </h2>
                  {state.items.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to clear your cart?')) {
                          clearCart();
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Clear Cart
                    </button>
                  )}
                </div>
                
                <div className="divide-y divide-gray-200">
                  {state.items.map((item) => {
                    return (
                    <div key={item.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                      {/* Responsive List Layout */}
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        {/* Product Image */}
                        <div className="shrink-0 self-center sm:self-start">
                          <ProductImage
                            imageBase64={item.imageBase64}
                            category={item.category || 'beef'}
                            name={item.name || 'Product'}
                            size="lg"
                            className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden shadow-sm"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg sm:text-xl text-gray-900 mb-1 sm:mb-2">{item.name || 'Product Name'}</h3>
                          <p className="text-gray-600 text-sm mb-2 sm:mb-3 leading-relaxed line-clamp-2">{item.description || 'No description available'}</p>
                          <div className="flex items-baseline gap-2 sm:gap-3">
                            <span className="text-xl sm:text-2xl font-bold text-red-600">€{(item.price || 0).toFixed(2)}</span>
                            <span className="text-xs sm:text-sm text-gray-500">per {item.unit || 'unit'}</span>
                          </div>
                        </div>

                        {/* Quantity Controls & Total - Mobile Stacked */}
                        <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-3 sm:gap-4 sm:min-w-[140px]">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
                            >
                              <FiMinus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
                            </button>
                            <span className="font-bold text-base sm:text-lg min-w-[2rem] sm:min-w-[3rem] text-center text-gray-900 px-1 sm:px-2">{item.quantity || 1}</span>
                            <button
                              onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-sm"
                            >
                              <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                          
                          {/* Total & Remove - Right aligned on mobile */}
                          <div className="flex items-center gap-3 sm:gap-2 sm:flex-col sm:items-end">
                            <div className="text-lg sm:text-xl font-bold text-gray-900">
                              €{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remove item"
                            >
                              <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
                
                                <div className="space-y-3 mb-6">
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
                  
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-xl font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-red-600">€{cartSummary.finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  className="w-full bg-elegant-red-600 text-white py-4 px-6 rounded-lg hover:bg-elegant-red-700 transition-colors font-semibold flex items-center justify-center gap-2 mb-4"
                >
                  <FiCreditCard className="w-5 h-5" />
                  Proceed to Checkout
                </button>
                
                <Link 
                  href="/customer/dashboard"
                  className="w-full text-center text-gray-600 hover:text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors block"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <CustomerMobileNav currentPage="cart" />
    </div>
  );
}
