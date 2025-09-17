"use client";

// src/components/AdminSidebar.tsx
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiHome, FiUsers, FiShoppingBag, FiBarChart2, FiSettings, FiLogOut } from "react-icons/fi";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const SIDEBAR_BG = "bg-gray-900";
const SIDEBAR_ACTIVE = "bg-elegant-red-600 text-white font-semibold shadow-lg";
const BUTTON_PRIMARY = "bg-elegant-red-600 text-white hover:bg-elegant-red-700 shadow-lg";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: <FiHome className="w-5 h-5" /> },
  { href: "/admin/users", label: "Users", icon: <FiUsers className="w-5 h-5" /> },
  { href: "/admin/products", label: "Products", icon: <FiShoppingBag className="w-5 h-5" /> },
  { href: "/admin/orders", label: "Orders", icon: <FiBarChart2 className="w-5 h-5" /> },
  { href: "/admin/settings", label: "Settings", icon: <FiSettings className="w-5 h-5" /> },
];

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return (
    <aside className={`w-64 flex-shrink-0 flex flex-col min-h-screen ${SIDEBAR_BG} shadow-xl`}>
      <div className="flex items-center justify-center px-6 py-8 border-b border-gray-700">
        <div className="relative h-12 w-full">
          <Image
            src="/logo.png"
            alt="Al Sabil Marketplace Logo"
            fill
            className="object-contain filter brightness-0 invert"
          />
        </div>
      </div>
      
      {/* Admin Tag */}
      <div className="mt-4 px-6">
        <span className="inline-block bg-elegant-red-600 text-white text-xs font-bold px-2 py-1 rounded">
          ADMIN PANEL
        </span>
      </div>
      
      <nav className="flex flex-col gap-2 mt-6 px-4">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`py-3 px-4 rounded-lg transition-all duration-200 flex items-center gap-3 ${
              pathname === link.href || pathname?.startsWith(link.href + "/")
                ? SIDEBAR_ACTIVE
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
            onClick={onClose}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="mt-auto px-4 pb-6">
        <button 
          className={`w-full rounded-lg ${BUTTON_PRIMARY} py-3 font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <FiLogOut className={`w-5 h-5 ${isLoggingOut ? 'animate-spin' : ''}`} />
          <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </aside>
  );
}
