"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  FiUsers,
  FiShoppingBag,
  FiBarChart2,
  FiSettings,
  FiPlus,
  FiUser,
} from "react-icons/fi";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminSidebarDrawer from "@/components/AdminSidebarDrawer";
import AdminHeader from "@/components/AdminHeader";
import {
  SkeletonTable,
  SkeletonDashboardCards,
} from "@/components/SkeletonLoader";
import { apiFetch } from "@/lib/api-client";

const BUTTON_PRIMARY = "bg-blue-600 hover:bg-blue-700 text-white shadow-lg";
const BUTTON_OUTLINE = "border-2 border-red-700 text-red-700 bg-white hover:bg-red-50 shadow-sm";

type AdminSummaryCard = {
  label: string;
  value: number;
  href: string;
  icon: ReactNode;
  iconBg: string;
  cardBg: string;
};

type AdminStats = {
  totals: {
    sellers: number;
    customers: number;
    products: number;
    orders: number;
    totalPaid: number;
    totalOutstanding: number;
  };
  recentSellers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    isActive: boolean;
  }>;
  recentOrders: Array<{
    id: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    sellerId?: string;
    sellerName?: string;
    customerId?: string;
  }>;
  sellerCustomerBreakdown: Array<{
    sellerId: string;
    sellerName: string;
    customerCount: number;
  }>;
};

function AdminDashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiFetch<{
          success: boolean;
          data: AdminStats;
          error?: string;
        }>("/api/admin/stats");

        if (response.success) {
          setStats(response.data);
        } else {
          setError(response.error || "Failed to load admin statistics");
        }
      } catch (err) {
        console.error("Failed to load admin statistics", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load admin statistics",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const summaryCards: AdminSummaryCard[] = useMemo(
    () => [
      {
        label: "Total Sellers",
        value: stats?.totals.sellers ?? 0,
        href: "/admin/users?role=seller",
        icon: <FiUsers className="w-7 h-7 text-blue-600" />,
        iconBg: "bg-blue-50 border border-blue-100",
        cardBg: "bg-white border-l-4 border-blue-500",
      },
      {
        label: "Total Customers",
        value: stats?.totals.customers ?? 0,
        href: "/admin/users?role=customer",
        icon: <FiUser className="w-7 h-7 text-green-600" />,
        iconBg: "bg-green-50 border border-green-100",
        cardBg: "bg-white border-l-4 border-green-500",
      },
      {
        label: "Total Products",
        value: stats?.totals.products ?? 0,
        href: "/admin/products",
        icon: <FiShoppingBag className="w-7 h-7 text-amber-600" />,
        iconBg: "bg-amber-50 border border-amber-100",
        cardBg: "bg-white border-l-4 border-amber-500",
      },
      {
        label: "Total Orders",
        value: stats?.totals.orders ?? 0,
        href: "/admin/orders",
        icon: <FiBarChart2 className="w-7 h-7 text-red-700" />,
        iconBg: "bg-red-50 border border-red-100",
        cardBg: "bg-white border-l-4 border-red-700",
      },
    ],
    [stats],
  );

  const recentSellers = stats?.recentSellers ?? [];
  const recentOrders = stats?.recentOrders ?? [];
  const sellerBreakdown = stats?.sellerCustomerBreakdown ?? [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
        <AdminSidebar />
      </div>

      <AdminHeader onMenuClick={() => setSidebarOpen(true)} title="Admin Dashboard" />

      <AdminSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-64 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

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
                  <span
                    className={`inline-block p-3 rounded-lg ${card.iconBg} group-hover:scale-110 transition-all duration-300`}
                  >
                    {card.icon}
                  </span>
                  <span className="text-lg font-semibold text-gray-800">{card.label}</span>
                </div>
                <span className="text-3xl font-bold tracking-tight text-gray-900">
                  {card.value}
                </span>
              </Link>
            ))}
          </section>
        )}

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
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {recentSellers.map((seller, index) => (
                    <tr
                      key={seller.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {seller.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {seller.email}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(seller.createdAt).toLocaleDateString()}
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
                  {recentSellers.length === 0 && (
                    <tr>
                      <td className="py-4 px-4 text-center text-gray-500" colSpan={5}>
                        No sellers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">Seller Customer Breakdown</h2>
            {isLoading ? (
              <SkeletonTable rows={4} cols={3} />
            ) : sellerBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm">No customer assignments found.</p>
            ) : (
              <div className="space-y-3">
                {sellerBreakdown.map((entry) => (
                  <div
                    key={entry.sellerId}
                    className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-gray-900 font-semibold">{entry.sellerName}</p>
                      <p className="text-xs text-gray-500">Seller ID: {entry.sellerId}</p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {entry.customerCount} customers
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">Recent Orders</h2>
            {isLoading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : recentOrders.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent orders.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="border border-gray-100 rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="inline-flex px-2 py-1 bg-gray-100 rounded-full font-medium">
                        Status: {order.status}
                      </span>
                      <span className="inline-flex px-2 py-1 bg-gray-100 rounded-full font-medium">
                        Payment: {order.paymentStatus}
                      </span>
                      <span className="inline-flex px-2 py-1 bg-gray-100 rounded-full font-medium">
                        Seller: {order.sellerName || order.sellerId || "Unknown"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 font-semibold">
                      Total: €{order.total.toFixed(2)}
                    </div>
                    <div className="flex gap-2 text-sm">
                      <Link
                        href={`/seller/orders/${order.id}`}
                        className="text-red-700 hover:text-red-800 font-semibold"
                      >
                        View order
                      </Link>
                      <span className="text-gray-300">•</span>
                      <Link
                        href={`/admin/users?role=customer&search=${order.customerId ?? ""}`}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        View customer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">System Status</h2>
            <div className="space-y-4">
              {["Database", "Authentication", "Storage", "API"].map((item) => (
                <div key={item} className="flex justify-between items-center">
                  <span className="text-gray-600">{item}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    Operational
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/admin/users"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2"
              >
                <FiUsers className="w-6 h-6 text-blue-600" />
                <span className="text-gray-900 font-medium">Manage Users</span>
              </Link>
              <Link
                href="/admin/settings"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2"
              >
                <FiSettings className="w-6 h-6 text-gray-600" />
                <span className="text-gray-900 font-medium">System Settings</span>
              </Link>
              <Link
                href="/admin/products"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2"
              >
                <FiShoppingBag className="w-6 h-6 text-amber-600" />
                <span className="text-gray-900 font-medium">Products</span>
              </Link>
              <Link
                href="/admin/orders"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 flex flex-col items-center justify-center text-center gap-2"
              >
                <FiBarChart2 className="w-6 h-6 text-red-700" />
                <span className="text-gray-900 font-medium">Orders</span>
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
