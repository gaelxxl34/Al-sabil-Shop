"use client";

import Image from "next/image";
import { FiMenu } from "react-icons/fi";
import NotificationBell from "@/components/NotificationBell";

interface SellerHeaderProps {
  onMenuClick: () => void;
}

export default function SellerHeader({ onMenuClick }: SellerHeaderProps) {
  return (
    <header className="md:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Menu Toggle Button - Left */}
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <FiMenu className="w-6 h-6" />
        </button>

        {/* Logo - Center */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <Image 
            src="/logo.png" 
            alt="Al Sabil Logo" 
            width={100} 
            height={32}
            className="h-8 w-auto"
          />
        </div>

        {/* Notification Bell - Right */}
        <div className="flex items-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
