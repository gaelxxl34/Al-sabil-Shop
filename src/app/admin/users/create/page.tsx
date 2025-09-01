"use client";

// src/app/admin/users/create/page.tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave, FiUser, FiMail, FiLock, FiUserCheck } from "react-icons/fi";
import AdminSidebar from "@/components/AdminSidebar";
import AdminSidebarDrawer from "@/components/AdminSidebarDrawer";
import AdminGuard from "@/components/AdminGuard";
import { apiFetch } from "@/lib/api-client";

// Brand-aligned colors
const BUTTON_PRIMARY = "bg-elegant-red-600 text-white hover:bg-elegant-red-700 shadow-lg";
const BUTTON_OUTLINE = "border-2 border-red-700 text-red-700 bg-white hover:bg-red-50 shadow-sm";

export default function CreateUserPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "seller" as "seller" | "admin"
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long!");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await apiFetch<{
        success: boolean;
        data?: {
          id: string;
          email: string;
          displayName: string;
          role: string;
        };
        error?: string;
      }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          displayName: formData.displayName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (result?.success) {
        setSuccess(true);
        setError(null);
        
        // Reset form
        setFormData({
          displayName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "seller"
        });

        // Show success message and redirect after delay
        setTimeout(() => {
          router.push('/admin/users');
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to create user');
      }
      
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
  <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/users"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
            <p className="text-gray-600 mt-1">Add a new admin or seller account</p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-800">
              <span className="font-semibold">Success!</span>
              <span>User created successfully. Redirecting...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Create User Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <FiUserCheck className="w-6 h-6 text-red-700" />
              User Information
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                <FiUser className="w-4 h-4 inline mr-2" />
                Display Name
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

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <FiMail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter email address"
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                <FiUserCheck className="w-4 h-4 inline mr-2" />
                Role
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
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <FiLock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Enter password (min 6 characters)"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <FiLock className="w-4 h-4 inline mr-2" />
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Confirm password"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                  isLoading 
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed" 
                    : BUTTON_PRIMARY
                }`}
              >
                <FiSave className="w-5 h-5" />
                <span>{isLoading ? "Creating..." : "Create User"}</span>
              </button>
              
              <Link
                href="/admin/users"
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${BUTTON_OUTLINE}`}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Role Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Role Descriptions</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div><strong>Admin:</strong> Full system access, can manage all users and settings</div>
            <div><strong>Seller:</strong> Can manage products, view orders, and manage customers</div>
          </div>
          <div className="mt-3 text-xs text-blue-600">
            <strong>Note:</strong> Customer accounts are created separately by sellers and cannot be created from this admin panel.
          </div>
        </div>
      </main>
      </div>
    </AdminGuard>
  );
}
