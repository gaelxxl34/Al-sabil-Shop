"use client";

import Image from "next/image";
import { FiMenu } from "react-icons/fi";
import NotificationBell from "@/components/NotificationBell";

interface AdminHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function AdminHeader({ onMenuClick, title }: AdminHeaderProps) {
  return (
    <header className="md:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 py-3 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <FiMenu className="w-6 h-6" />
        </button>

        <div className="absolute left-1/2 transform -translate-x-1/2">
          {title ? (
            <span className="text-gray-900 font-semibold">{title}</span>
          ) : (
            <Image
              src="/logo.png"
              alt="Al Sabil Logo"
              width={100}
              height={32}
              className="h-8 w-auto"
            />
          )}
        </div>

        <div className="flex items-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
