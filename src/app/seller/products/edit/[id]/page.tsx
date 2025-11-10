"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import SellerHeader from "@/components/SellerHeader";
import SellerGuard from "@/components/SellerGuard";
import { productApi } from "@/lib/api-client";
import { Product, UpdateProductRequest } from "@/types/product";
import { compressImage, validateImageFile } from "@/lib/image-utils";

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    category: "",
    description: "",
    imageBase64: "",
    isActive: true,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productApi.getProduct(productId);
      const productData = response.data;
      
      setProduct(productData);
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        unit: productData.unit || '',
        category: productData.category || '',
        isActive: productData.isActive !== false,
        imageBase64: productData.imageBase64 || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId, fetchProduct]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    try {
      const compressedBase64 = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        format: 'jpeg'
      });
      setFormData(prev => ({ ...prev, imageBase64: compressedBase64 }));
      setImagePreview(compressedBase64);
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Error processing image. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.unit.trim() || !formData.category) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updateData: UpdateProductRequest = {
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        category: formData.category as "beef" | "chicken" | "fish" | "lamb",
        description: formData.description.trim(),
        imageBase64: formData.imageBase64,
        isActive: formData.isActive,
      };

      await productApi.updateProduct(productId, updateData);
      router.push("/seller/products");
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageBase64: "" }));
    setImagePreview(null);
  };

  if (loading) {
    return (
      <SellerGuard>
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
          <div className="hidden md:flex">
            <SellerSidebar />
          </div>
          <main className="flex-1 md:ml-64 p-8">
            <div className="w-full max-w-6xl">
              <div className="animate-pulse max-w-2xl">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-40 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SellerGuard>
    );
  }

  if (error && !product) {
    return (
      <SellerGuard>
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
          <div className="hidden md:flex">
            <SellerSidebar />
          </div>
          <main className="flex-1 md:ml-64 p-8">
            <div className="w-full max-w-6xl">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl">
                <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Product</h2>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={() => router.push("/seller/products")}
                  className="px-4 py-2 bg-elegant-red-600 text-white rounded-lg hover:bg-elegant-red-700"
                >
                  Back to Products
                </button>
              </div>
            </div>
          </main>
        </div>
      </SellerGuard>
    );
  }

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
        <main className="flex-1 md:ml-64">
          <div className="w-full max-w-6xl px-4 pt-6 pb-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              <p className="text-gray-600 text-sm">Update product information and settings</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-2xl">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden max-w-2xl">
              <div className="p-6 space-y-6">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                {/* Unit and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Unit *
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="e.g., kg, pieces, box"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select category</option>
                      <option value="beef">Beef</option>
                      <option value="chicken">Chicken</option>
                      <option value="fish">Fish</option>
                      <option value="lamb">Lamb</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter product description (optional)"
                  />
                </div>

                {/* Product Status */}
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-5 h-5 text-red-700 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      Product is active
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">
                    Inactive products won&apos;t be visible to customers
                  </p>
                </div>

                {/* Product Image */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Product Image
                  </label>
                  
                  {imagePreview ? (
                    <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                      <Image
                        src={imagePreview}
                        alt="Product preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-elegant-red-600 text-white p-2 rounded-full hover:bg-elegant-red-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block w-full h-64 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 transition-colors">
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="text-sm font-medium">Click to upload product image</span>
                        <span className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/seller/products")}
                  className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-elegant-red-600 text-white rounded-lg hover:bg-elegant-red-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    "Update Product"
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
