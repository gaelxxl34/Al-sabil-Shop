"use client";

import Link from "next/link";
import { FiShoppingCart, FiHome, FiPackage, FiSettings } from "react-icons/fi";
import { useCart } from "@/contexts/CartContext";

interface CustomerMobileNavProps {
  currentPage?: 'dashboard' | 'cart' | 'orders' | 'settings';
}

export default function CustomerMobileNav({ currentPage = 'dashboard' }: CustomerMobileNavProps) {
  const { getItemCount, isHydrated } = useCart();

  const getCartItemCount = () => {
    return isHydrated ? getItemCount() : 0;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 h-16">
        <Link 
          href="/customer/dashboard"
          className={`flex flex-col items-center justify-center transition-colors ${
            currentPage === 'dashboard' 
              ? 'text-red-700 bg-red-50' 
              : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
          }`}
        >
          <FiHome className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Dashboard</span>
        </Link>
        
        <Link 
          href="/customer/cart"
          className={`flex flex-col items-center justify-center transition-colors ${
            currentPage === 'cart' 
              ? 'text-red-700 bg-red-50' 
              : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
          }`}
        >
          <div className="relative">
            <FiShoppingCart className="w-6 h-6 mb-1" />
            {getCartItemCount() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {getCartItemCount()}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Cart</span>
        </Link>
        
        <Link 
          href="/customer/orders"
          className={`flex flex-col items-center justify-center transition-colors ${
            currentPage === 'orders' 
              ? 'text-red-700 bg-red-50' 
              : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
          }`}
        >
          <FiPackage className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Orders</span>
        </Link>
        
        <Link 
          href="/customer/settings"
          className={`flex flex-col items-center justify-center transition-colors ${
            currentPage === 'settings' 
              ? 'text-red-700 bg-red-50' 
              : 'text-gray-600 hover:text-red-700 hover:bg-red-50'
          }`}
        >
          <FiSettings className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
