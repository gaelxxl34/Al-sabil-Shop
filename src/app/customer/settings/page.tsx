// src/app/customer/settings/page.tsx
// Customer Settings: Profile, preferences, and account management

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  FiSettings, 
  FiUser, 
  FiEdit, 
  FiLogOut, 
  FiBell, 
  FiLock, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiCreditCard, 
  FiHelpCircle,
  FiChevronRight,
  FiSave,
  FiX
} from "react-icons/fi";
import CustomerHeader from "@/components/CustomerHeader";
import CustomerMobileNav from "@/components/CustomerMobileNav";
import { useAuth } from "@/components/AuthProvider";
import { Customer } from "@/types/customer";
import { Skeleton } from "@/components/SkeletonLoader";

export default function CustomerSettings() {
  const router = useRouter();
  const { user, userData, logout, loading: authLoading } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [smsUpdates, setSmsUpdates] = useState(false);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated or not a customer
  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'customer')) {
      router.push('/login');
    }
  }, [user, userData, authLoading, router]);

  // Fetch customer data
  const fetchCustomerData = useCallback(async () => {
    if (!user || userData?.role !== 'customer') {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/customers/me');
      if (response.ok) {
        const result = await response.json();
        setCustomerData(result.data.customer);
      } else {
        setError('Failed to fetch customer data');
      }
    } catch (err) {
      setError('Failed to fetch customer data');
      console.error('Error fetching customer data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData?.role === 'customer') {
      fetchCustomerData();
    }
  }, [user, userData, fetchCustomerData]);

  // Profile data based on real customer data
  const userProfile = customerData ? {
    name: customerData.contactPerson || customerData.businessName,
    email: userData?.email || '',
    phone: customerData.phone || '',
    address: customerData.address || '',
    company: customerData.businessName || '',
    businessType: customerData.businessType || 'Not specified'
  } : {
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    businessType: ''
  };

  const [editedProfile, setEditedProfile] = useState({ ...userProfile });

  // Update editedProfile when customerData changes
  useEffect(() => {
    if (customerData) {
      const profile = {
        name: customerData.contactPerson || customerData.businessName,
        email: userData?.email || '',
        phone: customerData.phone || '',
        address: customerData.address || '',
        company: customerData.businessName || '',
        businessType: customerData.businessType || 'Not specified'
      };
      setEditedProfile(profile);
    }
  }, [customerData, userData]);

  const handleSaveProfile = async () => {
    try {
      // Here you would typically make an API call to update the customer data
      // For now, we'll just close the modal and show a success message
      setShowEditProfile(false);
      // TODO: Implement profile update API call
      console.log('Profile update not yet implemented:', editedProfile);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile({ ...userProfile });
    setShowEditProfile(false);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      try {
        await logout();
        router.push('/login');
      } catch (err) {
        console.error('Logout error:', err);
        // Fallback logout
        router.push('/login');
      }
    }
  };

  // Skeleton loading component for settings page
  const SettingsPageSkeleton = () => (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <CustomerHeader currentPage="settings" />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton height="h-8" width="w-8" rounded="rounded-lg" />
            <Skeleton height="h-8" width="w-32" />
          </div>
          <Skeleton height="h-4" width="w-48" />
        </div>

        {/* Profile Section Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Skeleton height="h-10" width="w-10" rounded="rounded-xl" />
              <Skeleton height="h-6" width="w-40" />
            </div>
            <Skeleton height="h-10" width="w-28" rounded="rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton height="h-10" width="w-10" rounded="rounded-xl" />
                  <div className="flex-1">
                    <Skeleton height="h-3" width="w-24" className="mb-2" />
                    <Skeleton height="h-6" width="w-full" />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton height="h-10" width="w-10" rounded="rounded-xl" />
                  <div className="flex-1">
                    <Skeleton height="h-3" width="w-32" className="mb-2" />
                    <Skeleton height="h-6" width="w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications Section Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton height="h-10" width="w-10" rounded="rounded-xl" />
            <Skeleton height="h-6" width="w-48" />
          </div>

          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <Skeleton height="h-10" width="w-10" rounded="rounded-lg" />
                  <div>
                    <Skeleton height="h-5" width="w-32" className="mb-1" />
                    <Skeleton height="h-4" width="w-48" />
                  </div>
                </div>
                <Skeleton height="h-7" width="w-12" rounded="rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Account Actions Section Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton height="h-10" width="w-10" rounded="rounded-xl" />
            <Skeleton height="h-6" width="w-36" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <Skeleton height="h-10" width="w-10" rounded="rounded-lg" />
                  <div>
                    <Skeleton height="h-5" width="w-32" className="mb-1" />
                    <Skeleton height="h-4" width="w-48" />
                  </div>
                </div>
                <Skeleton height="h-5" width="w-5" />
              </div>
            ))}
          </div>
        </div>

        {/* Logout Section Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-center gap-4 p-4">
            <Skeleton height="h-10" width="w-10" rounded="rounded-lg" />
            <Skeleton height="h-6" width="w-20" />
          </div>
        </div>
      </main>

      <CustomerMobileNav currentPage="settings" />
    </div>
  );

  // Show skeleton loading while authenticating or if user is not a customer
  if (authLoading || !user || userData?.role !== 'customer') {
    return <SettingsPageSkeleton />;
  }

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        <CustomerHeader currentPage="settings" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Settings</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                onClick={fetchCustomerData}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
        <CustomerMobileNav currentPage="settings" />
      </div>
    );
  }

  const EditProfileModal = () => {
    if (!showEditProfile) return null;

    return (
      <>
        {/* Desktop Modal */}
        <div className="hidden md:flex fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                <p className="text-sm text-gray-600 mt-1">Update your account information</p>
              </div>
              <button
                onClick={handleCancelEdit}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiUser className="w-4 h-4 inline mr-2" />
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 transition-colors"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiMail className="w-4 h-4 inline mr-2" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 transition-colors"
                      placeholder="Enter your email"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiPhone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 transition-colors"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiCreditCard className="w-4 h-4 inline mr-2" />
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={editedProfile.company}
                      onChange={(e) => setEditedProfile({ ...editedProfile, company: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 transition-colors"
                      placeholder="Enter your business name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiCreditCard className="w-4 h-4 inline mr-2" />
                      Business Type
                    </label>
                    <select
                      value={editedProfile.businessType}
                      onChange={(e) => setEditedProfile({ ...editedProfile, businessType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 transition-colors"
                    >
                      <option value="">Select business type</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Cafe">Cafe</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Catering">Catering</option>
                      <option value="Retail">Retail</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <FiMapPin className="w-4 h-4 inline mr-2" />
                      Address
                    </label>
                    <textarea
                      value={editedProfile.address}
                      onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 transition-colors resize-none"
                      placeholder="Enter your business address"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 mt-6 border-t border-gray-100">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <FiSave className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Full Screen Modal */}
        <div className="md:hidden fixed inset-0 bg-white z-50">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
              <p className="text-sm text-gray-600">Update your information</p>
            </div>
            <button
              onClick={handleCancelEdit}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Form */}
          <div className="p-4 space-y-6 pb-24">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiUser className="w-4 h-4 inline mr-2" />
                  Contact Person
                </label>
                <input
                  type="text"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiMail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={editedProfile.email}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiPhone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editedProfile.phone}
                  onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiCreditCard className="w-4 h-4 inline mr-2" />
                  Business Name
                </label>
                <input
                  type="text"
                  value={editedProfile.company}
                  onChange={(e) => setEditedProfile({ ...editedProfile, company: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiCreditCard className="w-4 h-4 inline mr-2" />
                  Business Type
                </label>
                <select
                  value={editedProfile.businessType}
                  onChange={(e) => setEditedProfile({ ...editedProfile, businessType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900"
                >
                  <option value="">Select business type</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Catering">Catering</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FiMapPin className="w-4 h-4 inline mr-2" />
                  Address
                </label>
                <textarea
                  value={editedProfile.address}
                  onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 resize-none"
                  placeholder="Enter your business address"
                />
              </div>
            </div>
          </div>

          {/* Mobile Fixed Bottom Actions */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
            <div className="flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl flex items-center justify-center gap-2 font-medium"
              >
                <FiSave className="w-5 h-5" />
                Save
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <CustomerHeader currentPage="settings" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FiSettings className="text-red-700" />
            Settings
          </h1>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <FiUser className="text-red-700 w-5 h-5" />
              </div>
              Profile Information
            </h2>
            <button
              onClick={() => setShowEditProfile(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-700 hover:text-red-800 font-medium bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              <FiEdit className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <FiUser className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contact Person</p>
                  <p className="font-semibold text-gray-900 text-lg mt-1">{userProfile.name || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <FiMail className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Email Address</p>
                  <p className="font-semibold text-gray-900 text-lg mt-1">{userProfile.email || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <FiPhone className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Phone Number</p>
                  <p className="font-semibold text-gray-900 text-lg mt-1">{userProfile.phone || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <FiCreditCard className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Business Name</p>
                  <p className="font-semibold text-gray-900 text-lg mt-1">{userProfile.company || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <FiCreditCard className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Business Type</p>
                  <p className="font-semibold text-gray-900 text-lg mt-1">{userProfile.businessType || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                  <FiMapPin className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Address</p>
                  <p className="font-semibold text-gray-900 text-lg mt-1 leading-relaxed">{userProfile.address || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FiBell className="text-blue-700 w-5 h-5" />
            </div>
            Notification Preferences
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <FiBell className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">Receive notifications about order updates</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <FiMail className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Email Updates</p>
                  <p className="text-sm text-gray-600">Receive order confirmations and promotions via email</p>
                </div>
              </div>
              <button
                onClick={() => setEmailUpdates(!emailUpdates)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  emailUpdates ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    emailUpdates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <FiPhone className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">SMS Updates</p>
                  <p className="text-sm text-gray-600">Receive SMS notifications for delivery updates</p>
                </div>
              </div>
              <button
                onClick={() => setSmsUpdates(!smsUpdates)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  smsUpdates ? 'bg-red-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    smsUpdates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <FiSettings className="text-green-700 w-5 h-5" />
            </div>
            Account Actions
          </h2>

          <div className="space-y-3">
            <button className="w-full group">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <FiLock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Change Password</p>
                    <p className="text-sm text-gray-600">Update your account password</p>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>

            <button className="w-full group">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <FiHelpCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Help & Support</p>
                    <p className="text-sm text-gray-600">Get help with your account or orders</p>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>

            <button className="w-full group">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <FiMail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Contact Support</p>
                    <p className="text-sm text-gray-600">support@al-sabil.com</p>
                  </div>
                </div>
                <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <button
            onClick={handleLogout}
            className="w-full group"
          >
            <div className="flex items-center justify-center gap-4 p-4 text-red-700 hover:bg-red-50 rounded-xl transition-colors font-semibold">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <FiLogOut className="w-5 h-5 text-red-600" />
              </div>
              <span>Sign Out</span>
            </div>
          </button>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal />

      <CustomerMobileNav currentPage="settings" />
    </div>
  );
}
