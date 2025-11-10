"use client";

// src/app/seller/dashboard/page.tsx
// TODO: Overview: users, products, orders

import Link from "next/link";
import { useState, useEffect } from "react";
import { FiUsers, FiBox, FiClock, FiCheckCircle } from "react-icons/fi";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import SellerHeader from "@/components/SellerHeader";
import SellerGuard from "@/components/SellerGuard";
import { useAuth } from "@/components/AuthProvider";
import { 
  SkeletonDashboardCards, 
  SkeletonTable 
} from "@/components/SkeletonLoader";
import { Customer } from "@/types/customer";
import { Product } from "@/types/product";
import { Order } from "@/types/cart";

// Brand-aligned color palette (Black + Red from logo)
const BUTTON_PRIMARY = "bg-blue-600 hover:bg-blue-700 text-white shadow-lg";
const BUTTON_OUTLINE = "border-2 border-red-700 text-red-700 bg-white hover:bg-red-50 shadow-sm";
const STATUS_PENDING = "bg-red-100 text-red-700 border border-red-200";
const STATUS_COMPLETED = "bg-green-100 text-green-700 border border-green-200";

interface DashboardData {
  customers: Customer[];
  products: Product[];
  orders: Order[];
}

interface DashboardStats {
  customersCount: number;
  productsCount: number;
  pendingOrdersCount: number;
  completedOrdersCount: number;
}

export default function SellerDashboard() {
	const { user, isLoggingOut } = useAuth();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dashboardData, setDashboardData] = useState<DashboardData>({
		customers: [],
		products: [],
		orders: []
	});
	const [stats, setStats] = useState<DashboardStats>({
		customersCount: 0,
		productsCount: 0,
		pendingOrdersCount: 0,
		completedOrdersCount: 0
	});

	// Fetch dashboard data
	useEffect(() => {
		// Don't fetch data if user is logging out or not authenticated
		if (isLoggingOut || !user) {
			console.log('🚫 SellerDashboard: Skipping data fetch - logout in progress or no user');
			return;
		}

		const fetchDashboardData = async () => {
			try {
				setIsLoading(true);
				setError(null);

				// Double-check user is still authenticated before making API calls
				if (isLoggingOut || !user) {
					console.log('🚫 SellerDashboard: User logged out during fetch, aborting');
					return;
				}

				// Fetch data from all endpoints in parallel
				const [customersRes, productsRes, ordersRes] = await Promise.all([
					fetch('/api/customers'),
					fetch('/api/products'),
					fetch('/api/orders')
				]);

				// Check for errors
				if (!customersRes.ok) {
					throw new Error(`Failed to fetch customers: ${customersRes.status}`);
				}
				if (!productsRes.ok) {
					throw new Error(`Failed to fetch products: ${productsRes.status}`);
				}
				if (!ordersRes.ok) {
					throw new Error(`Failed to fetch orders: ${ordersRes.status}`);
				}

				// Parse responses
				const [customersData, productsData, ordersData] = await Promise.all([
					customersRes.json(),
					productsRes.json(),
					ordersRes.json()
				]);

				const customers = customersData.data || [];
				const products = productsData.data || [];
				const orders = ordersData.data || [];

				// Update dashboard data
				setDashboardData({
					customers,
					products,
					orders
				});

				// Calculate stats
				const pendingOrders = orders.filter((order: Order) => 
					order.status === 'pending' || order.status === 'confirmed' || order.status === 'prepared'
				);
				const completedOrders = orders.filter((order: Order) => 
					order.status === 'delivered'
				);

				setStats({
					customersCount: customers.length,
					productsCount: products.length,
					pendingOrdersCount: pendingOrders.length,
					completedOrdersCount: completedOrders.length
				});

			} catch (err) {
				console.error('Error fetching dashboard data:', err);
				// Only set error if user is still authenticated (avoid showing errors during logout)
				if (!isLoggingOut && user) {
					setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
				}
			} finally {
				setIsLoading(false);
			}
		};

		fetchDashboardData();
	}, [user, isLoggingOut]); // Add user and isLoggingOut as dependencies

	// Create summary cards with real data
	const summaryCards = [
		{
			label: "Customers",
			value: stats.customersCount,
			href: "/seller/users",
			icon: <FiUsers className="w-7 h-7 text-blue-600" />,
			iconBg: "bg-blue-50 border border-blue-100",
			cardBg: "bg-white border-l-4 border-blue-500",
		},
		{
			label: "Products",
			value: stats.productsCount,
			href: "/seller/products",
			icon: <FiBox className="w-7 h-7 text-amber-600" />,
			iconBg: "bg-amber-50 border border-amber-100",
			cardBg: "bg-white border-l-4 border-amber-500",
		},
		{
			label: "Pending Orders",
			value: stats.pendingOrdersCount,
			href: "/seller/orders?status=pending",
			icon: <FiClock className="w-7 h-7 text-red-700" />,
			iconBg: "bg-red-50 border border-red-100",
			cardBg: "bg-white border-l-4 border-red-700",
		},
		{
			label: "Completed Orders",
			value: stats.completedOrdersCount,
			href: "/seller/orders?status=completed",
			icon: <FiCheckCircle className="w-7 h-7 text-green-600" />,
			iconBg: "bg-green-50 border border-green-100",
			cardBg: "bg-white border-l-4 border-green-500",
		},
	];

	// Get recent orders (latest 4)
	const recentOrders = dashboardData.orders
		.slice(0, 4)
		.map(order => {
			// Find customer name
			const customer = dashboardData.customers.find(c => c.id === order.customerId);
			const customerName = customer?.businessName || customer?.contactPerson || `Customer ${order.customerId?.slice(0, 8)}`;
			
		return {
			id: order.id,
			customer: customerName,
			date: new Date(order.createdAt).toLocaleDateString(),
			status: order.status === 'delivered' ? 'Completed' : 'Pending',
			total: `€${order.total?.toFixed(2) || '0.00'}`,
		};
	});	// Helper function to format order IDs consistently (8 characters)
	const formatOrderId = (orderId: string) => {
		return `#${orderId.slice(-8).toUpperCase()}`;
	};
	
	// Auto refresh has been removed - users will need to manually refresh the page
	// or navigate away and back to see updates
	
	return (
		<SellerGuard>
		<div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
			{/* Sidebar */}
			<div className="hidden md:flex">
				<SellerSidebar />
			</div>

			{/* Mobile Header */}
			<SellerHeader onMenuClick={() => setSidebarOpen(true)} />

			{/* Mobile Sidebar Drawer */}
			<SellerSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

			{/* Main Content */}
			<main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 md:py-8 md:mt-0 flex flex-col gap-6 sm:gap-8">
				{/* Error State */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
						<div className="text-red-600 flex-shrink-0">
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
							</svg>
						</div>
						<div className="flex-1">
							<p className="text-red-800 font-medium">Failed to load dashboard data</p>
							<p className="text-red-600 text-sm">{error}</p>
						</div>
						<button
							onClick={() => window.location.reload()}
							className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
						>
							Retry
						</button>
					</div>
				)}

				{/* Summary Cards */}
				{isLoading ? (
					<SkeletonDashboardCards count={4} />
				) : (
					<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
						{summaryCards.map((card) => (
							<Link
								key={card.label}
								href={card.href}
								className={`rounded-lg p-4 sm:p-6 flex flex-col gap-3 shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105 ${card.cardBg}`}
							>
								<div className="flex items-center gap-3">
									<span className={`inline-block p-2 sm:p-3 rounded-lg ${card.iconBg} group-hover:scale-110 transition-all duration-300`}>
										{card.icon}
									</span>
									<span className="text-base sm:text-lg font-semibold text-gray-800">{card.label}</span>
								</div>
								<span className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{card.value}</span>
							</Link>
						))}
					</section>
				)}

				{/* Quick Actions */}
				<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
					<Link href="/seller/users/create" className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-center ${BUTTON_OUTLINE}`}>
						+ Add New Customer
					</Link>
					<Link href="/seller/products/create" className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-center ${BUTTON_OUTLINE}`}>
						+ Add New Product
					</Link>
					<Link href="/seller/orders" className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-center ${BUTTON_PRIMARY}`}>
						View All Orders
					</Link>
					<Link href="/seller/reports" className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-200 text-center ${BUTTON_OUTLINE}`}>
						📊 Financial Reports
					</Link>
				</section>

				{/* Recent Orders Table */}
				<section className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
					<div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
						<h2 className="font-bold text-lg sm:text-xl text-gray-900">
							Recent Orders
						</h2>
						<Link
							href="/seller/orders"
							className="text-red-700 hover:text-red-800 hover:underline text-sm font-semibold transition-colors duration-200"
						>
							See all
						</Link>
					</div>
					
					{isLoading ? (
						<div className="p-4">
							<SkeletonTable rows={4} cols={6} showHeader={false} />
						</div>
					) : (
						<div className="overflow-x-auto">
							{/* Mobile Card View */}
							<div className="block sm:hidden">
								{recentOrders.length === 0 ? (
									<div className="py-8 px-4 text-center text-gray-500">
										<div className="flex flex-col items-center gap-2">
											<FiBox className="w-8 h-8 text-gray-400" />
											<p>No orders found</p>
											<p className="text-sm">Orders will appear here once customers start placing them</p>
										</div>
									</div>
								) : (
									<div className="divide-y divide-gray-100">
										{recentOrders.map((order) => (
											<div key={order.id} className="p-4 hover:bg-gray-50">
												<div className="flex justify-between items-start mb-2">
													<div className="font-mono text-sm font-semibold text-gray-900">
														{formatOrderId(order.id)}
													</div>
													<span
														className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === "Completed" ? STATUS_COMPLETED : STATUS_PENDING}`}
													>
														{order.status}
													</span>
												</div>
												<div className="text-sm text-gray-800 font-medium mb-1">
													{order.customer}
												</div>
												<div className="flex justify-between items-center">
													<div className="text-sm text-gray-600">
														{order.date}
													</div>
													<div className="flex items-center gap-3">
														<div className="text-sm font-semibold text-gray-900">
															{order.total}
														</div>
														<Link
															href={`/seller/orders/${order.id}`}
															className="text-red-700 hover:text-red-800 text-sm font-semibold"
														>
															Details
														</Link>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
							
							{/* Desktop Table View */}
							<table className="hidden sm:table min-w-full text-sm">
								<thead className="bg-gray-50">
									<tr className="text-left text-gray-700 border-b border-gray-200">
										<th className="py-3 px-4 font-semibold">Order ID</th>
										<th className="py-3 px-4 font-semibold">Customer</th>
										<th className="py-3 px-4 font-semibold">Date</th>
										<th className="py-3 px-4 font-semibold">Status</th>
										<th className="py-3 px-4 font-semibold">Total</th>
										<th className="py-3 px-4"></th>
									</tr>
								</thead>
								<tbody className="bg-white">
									{recentOrders.length === 0 ? (
										<tr>
											<td colSpan={6} className="py-8 px-4 text-center text-gray-500">
												<div className="flex flex-col items-center gap-2">
													<FiBox className="w-8 h-8 text-gray-400" />
													<p>No orders found</p>
													<p className="text-sm">Orders will appear here once customers start placing them</p>
												</div>
											</td>
										</tr>
									) : (
										recentOrders.map((order, index) => (
											<tr
												key={order.id}
												className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${
													index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
												}`}
											>
												<td className="py-3 px-4 font-mono text-gray-900 font-medium">
													{formatOrderId(order.id)}
												</td>
												<td className="py-3 px-4 text-gray-800 font-medium">
													{order.customer}
												</td>
												<td className="py-3 px-4 text-gray-600">
													{order.date}
												</td>
												<td className="py-3 px-4">
													<span
														className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === "Completed" ? STATUS_COMPLETED : STATUS_PENDING}`}
													>
														{order.status}
													</span>
												</td>
												<td className="py-3 px-4 text-gray-900 font-semibold">
													{order.total}
												</td>
												<td className="py-3 px-4 text-right">
													<Link
														href={`/seller/orders/${order.id}`}
														className="text-red-700 hover:text-red-800 hover:underline font-semibold transition-colors duration-200"
													>
														Details
													</Link>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</main>
		</div>
		</SellerGuard>
	);
}