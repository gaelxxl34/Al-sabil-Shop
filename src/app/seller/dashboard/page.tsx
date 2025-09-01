"use client";

// src/app/seller/dashboard/page.tsx
// TODO: Overview: users, products, orders

import Link from "next/link";
import { useState, useEffect } from "react";
import { FiUsers, FiBox, FiClock, FiCheckCircle } from "react-icons/fi";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import { 
  SkeletonDashboardCards, 
  SkeletonTable 
} from "@/components/SkeletonLoader";

// Brand-aligned color palette (Black + Red from logo)
const BUTTON_PRIMARY = "bg-blue-600 hover:bg-blue-700 text-white shadow-lg";
const BUTTON_OUTLINE = "border-2 border-red-700 text-red-700 bg-white hover:bg-red-50 shadow-sm";
const STATUS_PENDING = "bg-red-100 text-red-700 border border-red-200";
const STATUS_COMPLETED = "bg-green-100 text-green-700 border border-green-200";

const summaryCards = [
	{
		label: "Customers",
		value: 12,
		href: "/seller/users",
		icon: <FiUsers className="w-7 h-7 text-blue-600" />,
		iconBg: "bg-blue-50 border border-blue-100",
		cardBg: "bg-white border-l-4 border-blue-500",
	},
	{
		label: "Products",
		value: 34,
		href: "/seller/products",
		icon: <FiBox className="w-7 h-7 text-amber-600" />,
		iconBg: "bg-amber-50 border border-amber-100",
		cardBg: "bg-white border-l-4 border-amber-500",
	},
	{
		label: "Pending Orders",
		value: 5,
		href: "/seller/orders?status=pending",
		icon: <FiClock className="w-7 h-7 text-red-700" />,
		iconBg: "bg-red-50 border border-red-100",
		cardBg: "bg-white border-l-4 border-red-700",
	},
	{
		label: "Completed Orders",
		value: 27,
		href: "/seller/orders?status=completed",
		icon: <FiCheckCircle className="w-7 h-7 text-green-600" />,
		iconBg: "bg-green-50 border border-green-100",
		cardBg: "bg-white border-l-4 border-green-500",
	},
];

const recentOrders = [
	{
		id: "ORD-0012",
		customer: "Ali Store",
		date: "2025-07-05",
		status: "Pending",
		total: "$120.00",
	},
	{
		id: "ORD-0011",
		customer: "Yusuf Mart",
		date: "2025-07-04",
		status: "Completed",
		total: "$340.00",
	},
	{
		id: "ORD-0010",
		customer: "Fatima Shop",
		date: "2025-07-03",
		status: "Pending",
		total: "$80.00",
	},
	{
		id: "ORD-0009",
		customer: "Omar Supplies",
		date: "2025-07-02",
		status: "Completed",
		total: "$210.00",
	},
];

export default function SellerDashboard() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	
	// Simulating data loading
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 1000);
		
		return () => clearTimeout(timer);
	}, []);
	
	// Auto refresh has been removed - users will need to manually refresh the page
	// or navigate away and back to see updates
	
	return (
		<div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
			{/* Sidebar */}
			<div className="hidden md:flex">
				<SellerSidebar />
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
			<SellerSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

			{/* Main Content */}
			<main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
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

				{/* Quick Actions */}
				<section className="flex flex-wrap gap-4">
					<Link href="/seller/users/create" className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${BUTTON_OUTLINE}`}>
						+ Add New Customer
					</Link>
					<Link href="/seller/products/create" className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${BUTTON_OUTLINE}`}>
						+ Add New Product
					</Link>
					<Link href="/seller/orders" className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${BUTTON_PRIMARY}`}>
						View All Orders
					</Link>
					<Link href="/seller/reports" className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${BUTTON_OUTLINE}`}>
						📊 Financial Reports
					</Link>
				</section>

				{/* Recent Orders Table */}
				<section className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
					<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
						<h2 className="font-bold text-xl text-gray-900">
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
							<table className="min-w-full text-sm">
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
									{recentOrders.map((order, index) => (
										<tr
											key={order.id}
											className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${
												index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
											}`}
										>
											<td className="py-3 px-4 font-mono text-gray-900 font-medium">
												{order.id}
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
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</main>
		</div>
	);
}