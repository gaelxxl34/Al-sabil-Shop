"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FiShoppingCart, FiPackage, FiSettings, FiLogOut, FiChevronDown } from "react-icons/fi";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/contexts/CartContext";

interface CustomerHeaderProps {
  currentPage?: 'dashboard' | 'cart' | 'orders' | 'settings';
  showCartButton?: boolean;
  customActions?: React.ReactNode;
}

export default function CustomerHeader({ 
  currentPage = 'dashboard',
  showCartButton = true,
  customActions 
}: CustomerHeaderProps) {
  const router = useRouter();
  const { userData, logout } = useAuth();
  const { getItemCount, isHydrated } = useCart();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      try {
        setIsLoggingOut(true);
        await logout();
        // The AuthProvider logout will handle the redirect
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  const getCartItemCount = () => {
    return isHydrated ? getItemCount() : 0;
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userData?.role === 'customer') {
      return {
        name: userData.displayName || 'User',
        email: userData.email || '',
        businessName: userData.companyName || '',
        initials: (userData.displayName || 'U').charAt(0).toUpperCase()
      };
    }
    return {
      name: 'User',
      email: '',
      businessName: '',
      initials: 'U'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/customer/dashboard">
                <Image 
                  src="/logo.png" 
                  alt="Al Sabil Logo" 
                  width={120} 
                  height={40}
                  className="h-10 w-auto cursor-pointer"
                />
              </Link>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Premium Wholesale</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Custom Actions (like "Continue Shopping" button) */}
              {customActions}
              
              {/* Navigation Links */}
              {currentPage !== 'dashboard' && (
                <Link 
                  href="/customer/dashboard" 
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Browse Products
                </Link>
              )}
              
              {currentPage !== 'orders' && (
                <Link 
                  href="/customer/orders" 
                  className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  My Orders
                </Link>
              )}
              
              {/* Cart Button */}
              {showCartButton && currentPage !== 'cart' && (
                <Link 
                  href="/customer/cart" 
                  className="relative bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors flex items-center gap-2"
                >
                  <FiShoppingCart className="w-5 h-5" />
                  <span className="font-medium">Cart</span>
                  {getCartItemCount() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                      {getCartItemCount()}
                    </span>
                  )}
                </Link>
              )}
              
              {/* User Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-red-700 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {userInfo.initials}
                  </div>
                  <span className="font-medium">{userInfo.name}</span>
                  <FiChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{userInfo.name}</p>
                    <p className="text-sm text-gray-600">{userInfo.email}</p>
                    {userInfo.businessName && (
                      <p className="text-xs text-gray-500 mt-1">{userInfo.businessName}</p>
                    )}
                  </div>                    <Link 
                      href="/customer/orders"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FiPackage className="w-4 h-4" />
                      My Orders
                    </Link>
                    
                    <Link 
                      href="/customer/settings"
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FiSettings className="w-4 h-4" />
                      Settings
                    </Link>
                    
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button 
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-3 px-4 py-2 text-red-700 hover:bg-red-50 transition-colors w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiLogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-center">
          <Link href="/customer/dashboard">
            <Image 
              src="/logo.png" 
              alt="Al Sabil Logo" 
              width={100} 
              height={32}
              className="h-8 w-auto cursor-pointer"
            />
          </Link>
        </div>
      </header>
    </>
  );
}
