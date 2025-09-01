"use client";

// src/app/admin/dashboard/page.tsx
import { useState, useEffect, useMemo } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { FiUsers, FiShoppingBag, FiBarChart2, FiSettings, FiPlus, FiUser } from "react-icons/fi";
import AdminSidebar from "@/components/AdminSidebar";
import AdminSidebarDrawer from "@/components/AdminSidebarDrawer";
import { 
  SkeletonTable, 
  SkeletonDashboardCards 
} from "@/components/SkeletonLoader";

// Brand-aligned colors
const BUTTON_PRIMARY = "bg-blue-600 hover:bg-blue-700 text-white shadow-lg";
const BUTTON_OUTLINE = "border-2 border-red-700 text-red-700 bg-white hover:bg-red-50 shadow-sm";

// Mock data for development
const mockStats = {
  totalSellers: 5,
  totalCustomers: 23,
  totalProducts: 150,
  totalOrders: 89
};

const mockRecentSellers = [
  {
    id: '1',
    displayName: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2024-01-15'),
    isActive: true
  },
  {
    id: '2',
    displayName: 'Jane Smith',
    email: 'jane@example.com',
    createdAt: new Date('2024-01-10'),
    isActive: true
  },
  {
    id: '3',
    displayName: 'Bob Johnson',
    email: 'bob@example.com',
    createdAt: new Date('2024-01-05'),
    isActive: false
  }
];

function AdminDashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats] = useState(mockStats);
  const [recentSellers] = useState(mockRecentSellers);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const summaryCards = useMemo(() => [
    {
      label: "Total Sellers",
      value: stats.totalSellers,
      href: "/admin/users?role=seller",
      icon: <FiUsers className="w-7 h-7 text-blue-600" />,
      iconBg: "bg-blue-50 border border-blue-100",
      cardBg: "bg-white border-l-4 border-blue-500",
    },
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      href: "/admin/users?role=customer",
      icon: <FiUser className="w-7 h-7 text-green-600" />,
      iconBg: "bg-green-50 border border-green-100",
      cardBg: "bg-white border-l-4 border-green-500",
    },
    {
      label: "Total Products",
      value: stats.totalProducts,
      href: "/admin/products",
      icon: <FiShoppingBag className="w-7 h-7 text-amber-600" />,
      iconBg: "bg-amber-50 border border-amber-100",
      cardBg: "bg-white border-l-4 border-amber-500",
    },
    {
      label: "Total Orders",
      value: stats.totalOrders,
      href: "/admin/orders",
      icon: <FiBarChart2 className="w-7 h-7 text-red-700" />,
      iconBg: "bg-red-50 border border-red-100",
      cardBg: "bg-white border-l-4 border-red-700",
    },
  ], [stats]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-20 bg-gray-900 text-white p-3 rounded-lg shadow-lg hover:bg-gray-800 transition-all duration-200"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Mobile Sidebar Drawer */}
      <AdminSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/admin/users/create" className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${BUTTON_OUTLINE}`}>
              <FiPlus className="w-5 h-5" />
              <span>Add Seller</span>
            </Link>
            <Link href="/admin/settings" className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${BUTTON_PRIMARY}`}>
              <FiSettings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <SkeletonDashboardCards count={4} />
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={`rounded-lg p-6 flex flex-col gap-3 shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105 ${card.cardBg}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-block p-3 rounded-lg ${card.iconBg} group-hover:scale-110 transition-all duration-300`}>
                    {card.icon}
                  </span>
                  <span className="text-lg font-semibold text-gray-800">{card.label}</span>
                </div>
                <span className="text-3xl font-bold tracking-tight text-gray-900">{card.value}</span>
              </Link>
            ))}
          </section>
        )}

        {/* Recent Sellers */}
        <section className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 className="font-bold text-xl text-gray-900">
              Recent Sellers
            </h2>
            <Link
              href="/admin/users?role=seller"
              className="text-red-700 hover:text-red-800 hover:underline text-sm font-semibold transition-colors duration-200"
            >
              View all sellers
            </Link>
          </div>

          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={5} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-700 border-b border-gray-200">
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Created At</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {recentSellers.map((seller, index: number) => (
                    <tr
                      key={seller.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {seller.displayName || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {seller.email}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {seller.createdAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            seller.isActive
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {seller.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/users/${seller.id}`}
                          className="text-red-700 hover:text-red-800 hover:underline font-semibold transition-colors duration-200"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* System Overview */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Database</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  Operational
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Authentication</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  Operational
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Storage</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  Operational
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API</span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  Operational
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/admin/users" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2">
                <FiUsers className="w-6 h-6 text-blue-600" />
                <span className="text-gray-900 font-medium">Manage Users</span>
              </Link>
              <Link href="/admin/settings" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2">
                <FiSettings className="w-6 h-6 text-gray-600" />
                <span className="text-gray-900 font-medium">System Settings</span>
              </Link>
              <Link href="/admin/products" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2">
                <FiShoppingBag className="w-6 h-6 text-amber-600" />
                <span className="text-gray-900 font-medium">Products</span>
              </Link>
              <Link href="/admin/orders" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2">
                <FiBarChart2 className="w-6 h-6 text-red-700" />
                <span className="text-gray-900 font-medium">Analytics</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
