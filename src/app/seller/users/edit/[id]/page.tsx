// src/app/seller/users/edit/[id]/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import SellerGuard from "@/components/SellerGuard";
import SkeletonComponents from "@/components/SkeletonLoader";
import { apiFetch, productApi } from "@/lib/api-client";
import { UpdateCustomerData } from "@/types/customer";
import { Customer } from "@/types/customer";
import { Product } from "@/types/product";

export default function EditCustomer() {
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [branches, setBranches] = useState<Array<{ id: number; name: string; address: string; phone: string; contactPerson: string; email: string; password: string }>>([]);
  const [products, setProducts] = useState([{ id: 1, productId: "", price: "", quantity: "", unit: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch available products from the database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await productApi.getProducts();
        setAvailableProducts(response.data.filter(product => product.isActive));
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please refresh the page.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const result = await apiFetch<{
          success: boolean;
          data: Customer;
        }>(`/api/customers/${customerId}`);
        
        const customerData = result.data;
        setCustomer(customerData);
        
        // Add default email and password fields to existing branches
        const branchesWithDefaults = (customerData.branches || []).map(branch => ({
          ...branch,
          email: branch.email || "",
          password: branch.password || ""
        }));
        setBranches(branchesWithDefaults);
        
        // Convert prices back to products format
        const productsFromPrices = Object.entries(customerData.prices || {}).map((entry, index) => ({
          id: index + 1,
          productId: entry[0],
          price: entry[1].toString(),
          quantity: "1", // Default values since we don't store these
          unit: "kg"
        }));
        
        if (productsFromPrices.length > 0) {
          setProducts(productsFromPrices);
        }
        
      } catch (error: unknown) {
        console.error('Error fetching customer:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch customer');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId]);

  const addBranch = () => {
    const newId = branches.length > 0 ? Math.max(...branches.map(b => b.id)) + 1 : 1;
    setBranches([...branches, { id: newId, name: "", address: "", phone: "", contactPerson: "", email: "", password: "" }]);
  };

  const removeBranch = (id: number) => {
    setBranches(branches.filter(b => b.id !== id));
  };

  const updateBranch = (id: number, field: string, value: string) => {
    setBranches(branches.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const addProduct = () => {
    const newId = Math.max(...products.map(p => p.id)) + 1;
    setProducts([...products, { id: newId, productId: "", price: "", quantity: "", unit: "" }]);
  };

  const removeProduct = (id: number) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const updateProduct = (id: number, field: string, value: string) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        if (field === 'productId') {
          // When product is selected, auto-fill the unit
          const selectedProduct = availableProducts.find(product => product.id === value);
          return { 
            ...p, 
            [field]: value,
            unit: selectedProduct ? selectedProduct.unit : p.unit
          };
        }
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Validate required fields
      const requiredFields = ['businessName', 'contactPerson', 'email', 'phone', 'address'];
      for (const field of requiredFields) {
        if (!formData.get(field)) {
          throw new Error(`${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`);
        }
      }

      // Validate password if provided
      const password = formData.get('password') as string;
      if (password && password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Validate products - at least one product with price
      const validProducts = products.filter(p => p.productId && p.price && p.quantity && p.unit);
      if (validProducts.length === 0) {
        throw new Error('At least one product with complete information is required');
      }

      // Check if selected products exist in available products
      const availableProductIds = availableProducts.map(p => p.id);
      const invalidProducts = validProducts.filter(p => !availableProductIds.includes(p.productId));
      if (invalidProducts.length > 0) {
        throw new Error('Some selected products are no longer available. Please refresh and try again.');
      }

      // Validate branches if any are added
      const validBranches = branches.filter(b => b.name && b.address);
      for (const branch of branches) {
        if ((branch.name || branch.address || branch.phone || branch.contactPerson || branch.email || branch.password) && 
            (!branch.name || !branch.address)) {
          throw new Error('Branch name and address are required for all branches');
        }
        
        // For edit mode, email and password are optional since branches might already have accounts
        // But if email is provided, validate format
        if (branch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branch.email)) {
          throw new Error(`Invalid email format for branch: ${branch.email}`);
        }
        
        // If password is provided, validate strength
        if (branch.password && branch.password.length < 6) {
          throw new Error(`Branch user password must be at least 6 characters long`);
        }
      }

      // Prepare customer data
      const customerData: Partial<UpdateCustomerData> = {
        businessName: formData.get('businessName') as string,
        contactPerson: formData.get('contactPerson') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        businessType: formData.get('businessType') as string,
        deliveryCost: formData.get('deliveryCost') ? parseFloat(formData.get('deliveryCost') as string) : 0,
        branches: validBranches,
        products: validProducts,
        notes: formData.get('notes') as string || '',
      };

      // Add password only if provided
      if (password) {
        customerData.password = password;
      }

      // Submit to API
      await apiFetch<{
        success: boolean;
        message: string;
        data: {
          id: string;
          email: string;
          businessName: string;
          contactPerson: string;
          updatedAt: string;
        };
      }>(`/api/customers/${customerId}`, {
        method: 'PUT',
        body: JSON.stringify(customerData),
      });

      setSuccess('Customer updated successfully!');
      
      // Redirect after successful submission
      setTimeout(() => {
        router.push('/seller/users');
      }, 2000);

    } catch (error) {
      console.error('Error updating customer:', error);
      setError(error instanceof Error ? error.message : 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SellerGuard>
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
          <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
            <SellerSidebar />
          </div>
          <main className="flex-1 md:ml-64 overflow-y-auto">
            <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
              <SkeletonComponents.SkeletonCard className="w-full h-96" />
            </div>
          </main>
        </div>
      </SellerGuard>
    );
  }

  if (!customer) {
    return (
      <SellerGuard>
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
          <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
            <SellerSidebar />
          </div>
          <main className="flex-1 md:ml-64 overflow-y-auto">
            <div className="w-full max-w-2xl mx-auto px-4 py-8 text-center">
              <h1 className="text-2xl font-bold text-red-700">Customer Not Found</h1>
              <p className="text-gray-600 mt-2">The customer you&apos;re looking for doesn&apos;t exist.</p>
              <Link
                href="/seller/users"
                className="inline-block mt-4 px-4 py-2 bg-elegant-red-600 text-white rounded-lg hover:bg-elegant-red-700 transition"
              >
                Back to Customers
              </Link>
            </div>
          </main>
        </div>
      </SellerGuard>
    );
  }

  return (
    <SellerGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar - Fixed positioning */}
      <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:h-full md:z-10">
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
      
      {/* Main Content - Scrollable area with sidebar offset */}
      <main className="flex-1 md:ml-64 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Edit Customer</h1>
          <Link
            href="/seller/users"
            className="inline-block mb-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm w-fit"
          >
            ← Back to Customers
          </Link>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 flex flex-col gap-8 relative">
            {/* Loading Overlay */}
            {isSubmitting && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-xl">
                <div className="text-center">
                  <SkeletonComponents.SkeletonCard className="w-64 mb-4" />
                  <p className="text-gray-600">Updating customer...</p>
                </div>
              </div>
            )}
            
            {/* Error and Success Messages */}
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
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{success}</p>
                    <p className="text-sm text-green-600 mt-1">Redirecting to customers list...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Customer Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    required
                    defaultValue={customer.businessName}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                    placeholder="e.g. Ali's Restaurant Group"
                  />
                </div>
                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="contactPerson"
                    name="contactPerson"
                    required
                    defaultValue={customer.contactPerson}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                    placeholder="e.g. Ali Hassan"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    defaultValue={customer.email}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                    placeholder="e.g. ali@restaurant.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    defaultValue={customer.phone}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                    placeholder="e.g. 0501234567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                    placeholder="Leave empty to keep current password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only provide a new password if you want to change it (min 6 characters)
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Main Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  defaultValue={customer.address}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                  placeholder="e.g. 123 Main Street, Dubai, UAE"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    defaultValue={customer.businessType}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                  >
                    <option value="">Select business type</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="hotel">Hotel</option>
                    <option value="catering">Catering Service</option>
                    <option value="retail">Retail Store</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="deliveryCost" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Cost (€)
                  </label>
                  <input
                    type="number"
                    id="deliveryCost"
                    name="deliveryCost"
                    min="0"
                    step="0.01"
                    defaultValue={customer.deliveryCost}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                    placeholder="e.g. 15.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - Standard delivery charge for this customer (leave empty for free delivery)
                  </p>
                </div>
              </div>
            </div>

            {/* Branches/Locations Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Additional Branches/Locations</h2>
                  <p className="text-sm text-gray-500">Optional - Add multiple locations if your customer has branches</p>
                </div>
                <button
                  type="button"
                  onClick={addBranch}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                >
                  + Add Branch
                </button>
              </div>
              {branches.length === 0 ? (
                <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 9h10M7 13h10M7 17h10" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">No additional branches added</p>
                  <p className="text-xs text-gray-400 mt-1">Click &quot;Add Branch&quot; to add multiple locations</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {branches.map((branch, index) => (
                    <div key={branch.id} className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">
                          Branch {index + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeBranch(branch.id)}
                          className="text-red-700 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Branch Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={branch.name}
                            onChange={(e) => updateBranch(branch.id, 'name', e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-white"
                            placeholder="e.g. Downtown Branch"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            value={branch.contactPerson}
                            onChange={(e) => updateBranch(branch.id, 'contactPerson', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-white"
                            placeholder="e.g. Branch Manager Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={branch.address}
                            onChange={(e) => updateBranch(branch.id, 'address', e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-white"
                            placeholder="e.g. 456 Branch St, City, Country"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Branch Phone
                          </label>
                          <input
                            type="tel"
                            value={branch.phone}
                            onChange={(e) => updateBranch(branch.id, 'phone', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-white"
                            placeholder="e.g. 0509876543"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Products & Pricing Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Products & Pricing</h2>
                <button
                  type="button"
                  onClick={addProduct}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  + Add Product
                </button>
              </div>
              <div className="space-y-4">
                {products.map((product) => {
                  const usedProductIds = products.map(p => p.productId).filter(id => id !== product.productId);
                  
                  return (
                    <div key={product.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                        <select
                          value={product.productId}
                          onChange={(e) => updateProduct(product.id, 'productId', e.target.value)}
                          required
                          disabled={loadingProducts}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {loadingProducts ? 'Loading products...' : 'Select a product'}
                          </option>
                          {!loadingProducts && availableProducts.map((availableProduct) => (
                            <option 
                              key={availableProduct.id} 
                              value={availableProduct.id}
                              disabled={usedProductIds.includes(availableProduct.id)}
                            >
                              {availableProduct.name}
                            </option>
                          ))}
                        </select>
                        {loadingProducts && (
                          <p className="text-xs text-gray-500 mt-1">Loading available products...</p>
                        )}
                        {!loadingProducts && availableProducts.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            No products available. Please add products first.
                          </p>
                        )}
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={product.quantity}
                          onChange={(e) => updateProduct(product.id, 'quantity', e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-white"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                        <input
                          type="text"
                          value={product.unit}
                          readOnly
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed"
                          placeholder="Auto-filled"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Price (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => updateProduct(product.id, 'price', e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-white"
                          placeholder="0.00"
                        />
                      </div>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="text-red-700 hover:text-red-800 p-1 mt-5"
                          title="Remove product"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Select products from your product catalog, set quantities, units, and custom prices for this customer (in Euro). Each product can only be selected once.
                {availableProducts.length === 0 && !loadingProducts && (
                  <span className="text-red-500 block mt-1">
                    No products available. Please <Link href="/seller/products/create" className="underline">add products</Link> to your catalog first.
                  </span>
                )}
              </p>
            </div>

            {/* Notes Section */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                defaultValue={customer.notes}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50 resize-none"
                placeholder="Any additional information about this customer, special requirements, payment terms, etc..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end mt-2 pt-6 border-t border-gray-200">
              <Link
                href="/seller/users"
                className="px-8 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all text-base text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-lg font-semibold bg-elegant-red-600 text-white hover:bg-elegant-red-700 shadow-lg transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  'Updating Customer...'
                ) : (
                  'Update Customer'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
    </SellerGuard>
  );
}
