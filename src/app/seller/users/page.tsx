// src/app/seller/users/page.tsx
// TODO: List all customers

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import SellerHeader from "@/components/SellerHeader";
import SellerGuard from "@/components/SellerGuard";
import SkeletonComponents from "@/components/SkeletonLoader";
import { apiFetch } from "@/lib/api-client";
import { Customer } from "@/types/customer";

export default function SellerUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean; customer: Customer | null }>({ show: false, customer: null });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const result = await apiFetch<{
        success: boolean;
        data: Customer[];
        total: number;
      }>('/api/customers');
      
      setCustomers(result.data || []);
    } catch (error: unknown) {
      console.error('Error fetching customers:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 401) {
        // Handle unauthorized access - redirect to login
        window.location.href = '/login';
        return;
      }
      setError(error instanceof Error ? error.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      setDeleteLoading(customerId);
      
      await apiFetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      
      // Remove the customer from the local state
      setCustomers(customers.filter(customer => customer.id !== customerId));
      setShowDeleteModal({ show: false, customer: null });
      
    } catch (error: unknown) {
      console.error('Error deleting customer:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete customer');
    } finally {
      setDeleteLoading(null);
    }
  };

  const openDeleteModal = (customer: Customer) => {
    setShowDeleteModal({ show: true, customer });
  };

  const closeDeleteModal = () => {
    setShowDeleteModal({ show: false, customer: null });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };
  return (
    <SellerGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex">
        <SellerSidebar />
      </div>
      
      {/* Mobile Header */}
      <SellerHeader onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Mobile Sidebar Drawer */}
      <SellerSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6 overflow-y-auto h-screen md:h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 text-sm">Manage your customer accounts and profiles</p>
          </div>
          <Link
            href="/seller/users/create"
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 border-2 border-red-700 text-red-700 bg-white hover:bg-red-50 shadow-sm w-fit"
          >
            + Add New Customer
          </Link>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <SkeletonComponents.Skeleton height="h-6" width="w-1/4" />
            </div>
            <div className="divide-y divide-gray-200 px-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4">
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/6" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/6" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/6" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/6" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/12" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/12" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/12" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-1/12" />
                  <div className="flex gap-2">
                    <SkeletonComponents.Skeleton height="h-6" width="w-12" rounded="rounded-lg" />
                    <SkeletonComponents.Skeleton height="h-6" width="w-12" rounded="rounded-lg" />
                    <SkeletonComponents.Skeleton height="h-6" width="w-12" rounded="rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
                <button 
                  onClick={fetchCustomers}
                  className="text-sm text-red-700 underline hover:text-red-800 mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customers Table */}
        {!loading && !error && (
          <section className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {customers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers yet</h3>
                <p className="text-gray-500 mb-6">Start by adding your first customer to begin managing orders and pricing.</p>
                <Link
                  href="/seller/users/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-elegant-red-600 hover:bg-elegant-red-700"
                >
                  + Add First Customer
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-700 border-b border-gray-200">
                      <th className="py-3 px-4 font-semibold">Business</th>
                      <th className="py-3 px-4 font-semibold">Contact Person</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Phone</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold">Products</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Created</th>
                      <th className="py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {customers.map((customer, idx) => (
                      <tr
                        key={customer.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{customer.businessName}</div>
                            {customer.branches && customer.branches.length > 0 && (
                              <div className="text-xs text-gray-500">+{customer.branches.length} branches</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{customer.contactPerson}</td>
                        <td className="py-3 px-4 text-gray-700">{customer.email}</td>
                        <td className="py-3 px-4 text-gray-700">{customer.phone}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {customer.businessType || 'Not specified'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          <span className="text-sm font-medium">{Object.keys(customer.prices || {}).length}</span>
                          <span className="text-xs text-gray-500"> products</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              customer.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {!customer.passwordChanged && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                                Temp Password
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {formatDate(customer.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Link
                              href={`/seller/users/edit/${customer.id}`}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 hover:bg-blue-200 text-blue-700 transition"
                            >
                              Edit
                            </Link>
                            <button 
                              onClick={() => openDeleteModal(customer)}
                              disabled={deleteLoading === customer.id}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 transition disabled:opacity-50"
                            >
                              {deleteLoading === customer.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal.show && showDeleteModal.customer && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">Delete Customer</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700">
                    Are you sure you want to delete <strong>{showDeleteModal.customer.businessName}</strong>?
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-gray-500 mt-1 ml-4 list-disc">
                    <li>Customer account and login access</li>
                    <li>All customer data and pricing</li>
                    <li>Order history (if any)</li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={closeDeleteModal}
                    disabled={deleteLoading === showDeleteModal.customer.id}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(showDeleteModal.customer!.id)}
                    disabled={deleteLoading === showDeleteModal.customer.id}
                    className="px-4 py-2 text-sm font-medium text-white bg-elegant-red-600 border border-transparent rounded-lg hover:bg-elegant-red-700 disabled:opacity-50 flex items-center"
                  >
                    {deleteLoading === showDeleteModal.customer.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete Customer'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
    </SellerGuard>
  );
}
