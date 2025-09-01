"use client";

// src/app/admin/users/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiUsers, FiUser, FiRefreshCw } from "react-icons/fi";
import AdminSidebar from "@/components/AdminSidebar";
import AdminSidebarDrawer from "@/components/AdminSidebarDrawer";
import { SkeletonTable } from "@/components/SkeletonLoader";
import AdminGuard from "@/components/AdminGuard";
import { apiFetch } from "@/lib/api-client";

// Brand-aligned colors
const BUTTON_PRIMARY = "bg-elegant-red-600 text-white hover:bg-elegant-red-700 shadow-lg";

interface User {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'seller' | 'customer';
  createdAt: string;
  isActive: boolean;
  emailVerified?: boolean;
  lastSignIn?: string;
}

export default function AdminUsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiFetch<{
        success: boolean;
        data: User[];
        total: number;
        error?: string;
      }>('/api/users');
      
      if (result.success) {
        // Convert createdAt strings to Date objects for sorting
        const usersWithDates = result.data.map((user: User) => {
          let createdAtISO: string;
          
          try {
            if (user.createdAt) {
              const date = new Date(user.createdAt);
              // Check if the date is valid
              if (!isNaN(date.getTime())) {
                createdAtISO = date.toISOString();
              } else {
                console.warn(`Invalid createdAt date for user ${user.id}:`, user.createdAt);
                createdAtISO = new Date().toISOString();
              }
            } else {
              createdAtISO = new Date().toISOString();
            }
          } catch (error) {
            console.error(`Error parsing createdAt for user ${user.id}:`, error);
            createdAtISO = new Date().toISOString();
          }

          return {
            ...user,
            createdAt: createdAtISO
          };
        });
        
        // Sort by creation date (newest first)
        usersWithDates.sort((a: User, b: User) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setUsers(usersWithDates);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          setError('Unable to connect to server. Please check your connection.');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to fetch users');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check admin access and fetch users
  fetchUsers();

    // Check for URL parameters for success messages
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('updated') === 'true') {
      setSuccessMessage('User updated successfully');
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, []);

  // Delete user function
  const handleDeleteUser = async (userId: string, userName: string, userRole: string) => {
    let confirmMessage = `Are you sure you want to delete user "${userName}"?\n\n`;
    
    if (userRole === 'seller') {
      confirmMessage += "⚠️ WARNING: This will also delete:\n";
      confirmMessage += "• All customers associated with this seller\n";
      confirmMessage += "• All products created by this seller\n";
      confirmMessage += "• All orders involving this seller\n\n";
    } else if (userRole === 'customer') {
      confirmMessage += "⚠️ This will also delete:\n";
      confirmMessage += "• Customer profile data\n";
      confirmMessage += "• All orders placed by this customer\n\n";
    }
    
    confirmMessage += "This action cannot be undone!";

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete user');
      }

      // Refresh the user list
      await fetchUsers();
      setSuccessMessage('User and all associated data deleted successfully');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete user');
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <FiUsers className="w-4 h-4 text-purple-600" />;
      case 'seller':
        return <FiUser className="w-4 h-4 text-blue-600" />;
      case 'customer':
        return <FiUser className="w-4 h-4 text-green-600" />;
      default:
        return <FiUser className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return "bg-purple-100 text-purple-700 border border-purple-200";
      case 'seller':
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case 'customer':
        return "bg-green-100 text-green-700 border border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <AdminGuard>
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
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Sidebar Drawer */}
      <AdminSidebarDrawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
  <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage admin and seller accounts</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            >
              <FiRefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link 
              href="/admin/users/create" 
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${BUTTON_PRIMARY}`}
            >
              <FiPlus className="w-5 h-5" />
              <span>Add User</span>
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-800">
              <span className="font-semibold">Success:</span>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-bold text-xl text-gray-900">
              Users ({filteredUsers.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={5} cols={6} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-700 border-b border-gray-200">
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Created</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {getRoleIcon(user.role)}
                          </div>
                          <span className="text-gray-900 font-medium">
                            {user.displayName || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleBadgeStyle(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.isActive
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/users/edit/${user.id}`}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit user"
                          >
                            <FiEdit className="w-4 h-4" />
                          </Link>
                          <button
                            className="p-2 text-red-700 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete user"
                            onClick={() => handleDeleteUser(user.id, user.displayName || user.email, user.role)}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No users found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
  </div>
  </AdminGuard>
  );
}
