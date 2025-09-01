// src/app/sellexport default function SellerProductsPage() {e.tsx
// TODO: List all products (edit/delete)

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { GiMeat, GiChickenOven, GiFishCooked } from "react-icons/gi";
import SellerSidebar from "@/components/SellerSidebar";
import SellerSidebarDrawer from "@/components/SellerSidebarDrawer";
import SkeletonComponents from "@/components/SkeletonLoader";
import ProductImage from "@/components/ProductImage";
import { productApi } from "@/lib/api-client";
import { Product } from "@/types/product";

export default function SellerProducts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; product: Product | null }>({
    show: false,
    product: null
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productApi.getProducts();
      setProducts(response.data);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    setDeleteModal({ show: false, product: null });
    
    try {
      setDeletingId(productId);
      await productApi.deleteProduct(productId);
      // Remove from local state
      setProducts(products.filter(p => p.id !== productId));
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const openDeleteModal = (product: Product) => {
    setDeleteModal({ show: true, product });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ show: false, product: null });
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
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
        <div className="w-full max-w-6xl mx-auto px-4 pt-6 pb-8 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <Link
              href="/seller/products/create"
              className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 border-2 border-red-700 text-red-700 bg-white hover:bg-red-50 shadow-sm w-fit"
            >
              + Add New Product
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={fetchProducts}
                className="mt-2 text-red-700 hover:text-red-800 text-sm font-medium"
              >
                Try again
              </button>
            </div>
          )}
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <SkeletonComponents.Skeleton height="h-48" width="w-full" />
                  <div className="p-6 space-y-3">
                    <SkeletonComponents.Skeleton height="h-6" width="w-3/4" />
                    <SkeletonComponents.SkeletonText lines={2} />
                    <div className="flex gap-2 pt-2">
                      <SkeletonComponents.Skeleton height="h-8" width="w-1/2" />
                      <SkeletonComponents.Skeleton height="h-8" width="w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
                <GiMeat className="w-full h-full" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No products yet</h3>
              <p className="text-gray-500 mb-6">Start building your product catalog</p>
              <Link
                href="/seller/products/create"
                className="inline-block px-6 py-3 rounded-lg font-semibold bg-elegant-red-600 text-white hover:bg-elegant-red-700 shadow-lg transition-all"
              >
                Add Your First Product
              </Link>
            </div>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col overflow-hidden hover:shadow-xl transition-all group">
                  <div className="relative w-full h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
                    <ProductImage
                      imageBase64={product.imageBase64}
                      category={product.category as 'beef' | 'chicken' | 'fish' | 'lamb'}
                      name={product.name}
                      size="xl"
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 right-2 bg-white/80 text-xs font-semibold px-3 py-1 rounded-full text-gray-700 border border-gray-200">
                      {product.unit}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-3 p-6">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
                      {product.description && (
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                          {product.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          Added {new Date(product.createdAt).toISOString().split('T')[0]}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Link
                        href={`/seller/products/edit/${product.id}`}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => openDeleteModal(product)}
                        disabled={deletingId === product.id}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 hover:bg-red-200 text-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === product.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && deleteModal.product && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Delete Product</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete <strong>{deleteModal.product.name}</strong>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will permanently remove the product from your catalog and make it unavailable to customers.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={closeDeleteModal}
                  disabled={deletingId === deleteModal.product.id}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteModal.product!.id)}
                  disabled={deletingId === deleteModal.product.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-elegant-red-600 border border-transparent rounded-lg hover:bg-elegant-red-700 disabled:opacity-50 flex items-center"
                >
                  {deletingId === deleteModal.product.id ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Product'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
