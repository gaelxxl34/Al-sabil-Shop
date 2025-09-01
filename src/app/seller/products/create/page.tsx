// src/app/seller/products/create/page.tsx
// TODO: Form to add/edit product

"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import { productApi } from "@/lib/api-client";
import { CreateProductRequest } from "@/types/product";
import { compressImage, validateImageFile } from "@/lib/image-utils";

export default function CreateProduct() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate the image file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    setSelectedImage(file);
    setImageProcessing(true);
    setError(null);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Compress image for storage
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'jpeg'
      });
      
      setCompressedImage(compressed);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image. Please try again.');
      setSelectedImage(null);
      setImagePreview(null);
    } finally {
      setImageProcessing(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setCompressedImage(null);
    setImageProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      
      const productData: CreateProductRequest = {
        name: formData.get('name') as string,
        unit: formData.get('unit') as string,
        category: formData.get('category') as 'beef' | 'chicken' | 'fish' | 'lamb',
        description: formData.get('description') as string || undefined,
        imageBase64: compressedImage || undefined,
      };

      await productApi.createProduct(productData);
      
      // Redirect to products list on success
      router.push('/seller/products');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearForm = () => {
    removeImage();
    setError(null);
  };
  return (
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
      <main className="flex-1 md:ml-64 overflow-y-auto min-h-screen">
        <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Add New Product</h1>
          <Link
            href="/seller/products"
            className="inline-block mb-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm w-fit"
          >
            ← Back to Products
          </Link>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                  placeholder="e.g. Beef Ribeye Steak 1kg"
                />
              </div>
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="unit"
                  name="unit"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
                  placeholder="e.g. Tray, Piece, Pack, kg"
                />
              </div>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50"
              >
                <option value="">Select category</option>
                <option value="beef">Beef</option>
                <option value="chicken">Chicken</option>
                <option value="fish">Fish</option>
                <option value="lamb">Lamb</option>
              </select>
            </div>
            
            {/* Product Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              {!imagePreview ? (
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={imageProcessing}
                  />
                  {imageProcessing ? (
                    <div className="mx-auto w-12 h-12 text-blue-500 mb-4">
                      <svg className="animate-spin w-12 h-12" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <p className="text-gray-500 mb-2">
                    {imageProcessing ? 'Processing image...' : 'Click to upload product image'}
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG up to 10MB • Images will be compressed automatically</p>
                </div>
              ) : (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="Product preview"
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-elegant-red-600 text-white rounded-full p-2 hover:bg-elegant-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="mt-2 text-center">
                    <p className="text-sm text-gray-600 mb-1">{selectedImage?.name}</p>
                    <label className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                      Change image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition text-gray-900 bg-gray-50 resize-none"
                placeholder="Optional product details, cut, origin, cooking instructions, etc."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-end mt-2">
              <button
                type="button"
                onClick={handleClearForm}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-lg font-semibold bg-elegant-red-600 text-white hover:bg-elegant-red-700 shadow-lg transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Product...
                  </>
                ) : (
                  'Add Product'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
