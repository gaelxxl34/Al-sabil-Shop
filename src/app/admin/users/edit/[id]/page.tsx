"use client";

// src/app/admin/users/edit/[id]/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiSave, FiUser } from "react-icons/fi";
import AdminSidebar from "@/components/AdminSidebar";
import AdminSidebarDrawer from "@/components/AdminSidebarDrawer";
import AdminGuard from "@/components/AdminGuard";
import { apiFetch } from "@/lib/api-client";

// Brand-aligned colors
const BUTTON_PRIMARY = "bg-elegant-red-600 text-white hover:bg-elegant-red-700 shadow-lg";
const BUTTON_SECONDARY = "bg-gray-600 text-white hover:bg-gray-700 shadow-lg";

interface User {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'seller' | 'customer';
  isActive: boolean;
  createdAt: string;
  lastSignIn?: string;
  emailVerified: boolean;
}

interface EditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    role: 'seller' as 'admin' | 'seller',
    isActive: true
  });

  // Get params asynchronously
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setUserId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  // Fetch user data
  const fetchUser = async () => {
    if (!userId) return; // Wait for userId to be set
    
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiFetch<{
        success: boolean;
        data?: User;
        error?: string;
      }>(`/api/users/${userId}`);
      
      if (result.success && result.data) {
        const userData = result.data;
        setUser(userData);
        setFormData({
          displayName: userData.displayName || '',
          role: userData.role === 'admin' ? 'admin' : 'seller',
          isActive: userData.isActive
        });
      } else {
        throw new Error(result.error || 'Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to fetch user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
  if (userId) fetchUser();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('User ID not available');
      return;
    }
    
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const result = await apiFetch<{
        success: boolean;
        data?: User;
        error?: string;
      }>(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      
      if (result.success) {
        // Redirect back to users list with success message
        router.push('/admin/users?updated=true');
      } else {
        throw new Error(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update user');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        <div className="hidden md:flex">
          <AdminSidebar />
        </div>
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        <div className="hidden md:flex">
          <AdminSidebar />
        </div>
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
              <p className="text-gray-600 mb-6">The user you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to edit them.</p>
              <Link 
                href="/admin/users" 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${BUTTON_SECONDARY}`}
              >
                <FiArrowLeft className="w-5 h-5" />
                Back to Users
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
  <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
            <p className="text-gray-600 mt-1">Update user information and permissions</p>
          </div>
          <Link 
            href="/admin/users" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <FiArrowLeft className="w-5 h-5" />
            Back to Users
          </Link>
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

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <FiUser className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.displayName || 'No Name'}</h2>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                {user.lastSignIn && (
                  <span>Last Sign In: {new Date(user.lastSignIn).toLocaleDateString()}</span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  user.emailVerified 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit User Information</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter display name"
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Only admin and seller accounts can be managed from this panel
              </p>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-red-700 focus:ring-red-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Account is active
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Inactive users cannot sign in to their accounts
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${BUTTON_PRIMARY} ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FiSave className="w-5 h-5" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              
              <Link
                href="/admin/users"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
  </div>
  </AdminGuard>
  );
}
