// src/app/customer/dashboard/page.tsx
// Customer Dashboard: Browse products, view prices, add to cart

"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiShoppingCart, FiSearch } from "react-icons/fi";
import { GiMeat } from "react-icons/gi";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/contexts/CartContext";
import { customerApi } from "@/lib/api-client";
import { Customer } from "@/types/customer";
import { Product } from "@/types/product";
import CustomerHeader from "@/components/CustomerHeader";
import CustomerMobileNav from "@/components/CustomerMobileNav";
import CustomerPageSkeleton from "@/components/CustomerPageSkeleton";
import ProductImage from "@/components/ProductImage";

interface ProductWithPrice extends Product {
  customerPrice?: number;
  inStock: boolean;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const { state: cartState, addItem, getItemCount, isHydrated } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingQuantity, setEditingQuantity] = useState<Record<string, boolean>>({});
  const [tempQuantity, setTempQuantity] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  
  // Data loading states
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get cart item count for this product
  const getCartQuantity = (productId: string): number => {
    if (!isHydrated) return 0; // Don't show cart quantities until hydrated
    const cartItem = cartState.items.find(item => item.productId === productId);
    return cartItem?.quantity || 0;
  };

  // Handle hydration mismatch from browser extensions
  useEffect(() => {
    setMounted(true);
  }, []);

    // Prevent automatic scrolling when cart changes
  useEffect(() => {
    if (mounted) {
      // Store current scroll position when cart changes
      scrollPositionRef.current = window.pageYOffset;
    }
  }, [cartState.items, mounted]);

  // Generate categories based on assigned products
  const getCategoriesFromProducts = useCallback(() => {
    const categoryMap = new Map();
    
    // Always include "All Products"
    categoryMap.set("all", { id: "all", label: "All Products", icon: "🛒" });
    
    // Extract unique categories from assigned products
    products.forEach(product => {
      if (!categoryMap.has(product.category)) {
        let categoryInfo;
        switch (product.category.toLowerCase()) {
          case 'beef':
            categoryInfo = { id: "beef", label: "Beef", icon: "🥩" };
            break;
          case 'chicken':
            categoryInfo = { id: "chicken", label: "Chicken", icon: "🐔" };
            break;
          case 'fish':
            categoryInfo = { id: "fish", label: "Fish", icon: "🐟" };
            break;
          case 'lamb':
            categoryInfo = { id: "lamb", label: "Lamb", icon: "🐑" };
            break;
          default:
            categoryInfo = { id: product.category, label: product.category, icon: "🛒" };
        }
        categoryMap.set(product.category, categoryInfo);
      }
    });
    
    return Array.from(categoryMap.values());
  }, [products]);

  // Reset category selection when products change
  useEffect(() => {
    if (products.length > 0) {
      const categoryMap = new Map();
      
      // Always include "All Products"
      categoryMap.set("all", { id: "all", label: "All Products", icon: "🛒" });
      
      // Extract unique categories from assigned products
      products.forEach(product => {
        if (!categoryMap.has(product.category)) {
          categoryMap.set(product.category, { id: product.category, label: product.category, icon: "🛒" });
        }
      });
      
      const availableCategories = Array.from(categoryMap.keys());
      if (!availableCategories.includes(selectedCategory)) {
        setSelectedCategory("all");
      }
    }
  }, [products, selectedCategory]);

  // Redirect if not authenticated or not a customer
  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'customer')) {
      router.push('/login');
    }
  }, [user, userData, authLoading, router]);

  // Fetch customer data and products
  useEffect(() => {
    const fetchData = async () => {
      if (!user || userData?.role !== 'customer') {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use the customer API to get data
        const response = await customerApi.getMe();
        
        // Debug: Log the response to see what we're getting
        console.log('🔍 Dashboard - API Response:', response);
        
        // Validate response structure
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }
        
        setCustomerData(response.data.customer);
        
        // Safely map products with customer-specific prices
        const products = response.data.products || []; // Fallback to empty array
        const customerPrices = response.data.customer?.prices || {}; // Fallback to empty object
        
        console.log('🔍 Dashboard - Products:', products);
        console.log('🔍 Dashboard - Customer Prices:', customerPrices);
        
        const assignedProducts: ProductWithPrice[] = products.map((product: Product) => ({
          ...product,
          customerPrice: customerPrices[product.id] || 0,
          inStock: true // You can add stock management later
        }));

        console.log('🔍 Dashboard - Assigned Products:', assignedProducts);
        setProducts(assignedProducts);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userData]);

  // Auto refresh has been removed - users will need to manually refresh the page
  // or navigate away and back to see updates

  // Sample products data with customer-specific pricing
  const categories = getCategoriesFromProducts();

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (productId: string, quantity = 1) => {
    const product = products.find(p => p.id === productId);
    if (product && product.customerPrice) {
      addItem(product, product.customerPrice, quantity);
      setEditingQuantity(prev => ({
        ...prev,
        [productId]: false
      }));
      setTempQuantity(prev => {
        const newTemp = { ...prev };
        delete newTemp[productId];
        return newTemp;
      });
    }
  };

  const startEditingQuantity = (productId: string) => {
    setEditingQuantity(prev => ({
      ...prev,
      [productId]: true
    }));
    setTempQuantity(prev => ({
      ...prev,
      [productId]: getCartQuantity(productId)?.toString() || '1'
    }));
  };

  const handleQuantityChange = (productId: string, value: string) => {
    setTempQuantity(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const finishEditingQuantity = (productId: string) => {
    const tempValue = tempQuantity[productId];
    const numValue = parseInt(tempValue || '0');
    
    if (isNaN(numValue) || numValue <= 0) {
      // For now, we'll just cancel editing
      setEditingQuantity(prev => ({
        ...prev,
        [productId]: false
      }));
      setTempQuantity(prev => {
        const newTemp = { ...prev };
        delete newTemp[productId];
        return newTemp;
      });
    } else {
      handleAddToCart(productId, numValue);
    }
  };

  // Handle button clicks to prevent page jumping
  const handleAddToCartClick = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Store current scroll position
    const currentScrollY = window.scrollY;
    
    handleAddToCart(productId);
    
    // Restore scroll position after state update
    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 0);
  };

  const getTotalItems = () => {
    return getItemCount();
  };

  const getTotalPrice = () => {
    return cartState.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  // Show loading or error states
  if (!mounted || authLoading || loading) {
    return (
      <CustomerPageSkeleton
        showTitle={true}
        titleDescription="Discover our premium selection of fresh meat, poultry, and seafood at wholesale prices."
        contentType="dashboard"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== 'customer') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <CustomerHeader 
        currentPage="dashboard" 
        showCartButton={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          {loading ? (
            <div className="space-y-3">
              <div className="animate-pulse bg-gray-200 h-8 w-1/2 rounded-md"></div>
              <div className="animate-pulse bg-gray-200 h-6 w-3/4 rounded-md"></div>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome{customerData?.contactPerson ? `, ${customerData.contactPerson}` : ''} to Al Sabil
              </h2>
              <p className="text-gray-600 text-lg">Discover our premium selection of fresh meat, poultry, and seafood at wholesale prices.</p>
            </>
          )}
          {isHydrated && getTotalItems() > 0 && !loading && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 transition-all duration-200 ease-in-out opacity-90">
              <div className="flex items-center justify-between">
                <span className="text-red-800 font-medium text-sm">
                  Cart: €{getTotalPrice().toFixed(2)} ({getTotalItems()} items)
                </span>
                <Link 
                  href="/customer/cart"
                  className="bg-red-700 text-white px-4 py-1.5 rounded-lg hover:bg-red-800 transition-colors font-medium text-sm"
                >
                  View Cart
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          {loading ? (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="animate-pulse bg-gray-200 h-12 w-full lg:w-1/2 rounded-md"></div>
              <div className="flex flex-wrap gap-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-12 w-24 rounded-md"></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500 text-gray-900"
                />
              </div>
              
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === category.id
                        ? "bg-red-700 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 text-red-700 hover:text-red-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="animate-pulse bg-gray-200 h-48 w-full"></div>
                <div className="p-6 space-y-3">
                  <div className="animate-pulse bg-gray-200 h-6 w-3/4 rounded-md"></div>
                  <div className="space-y-2">
                    <div className="animate-pulse bg-gray-200 h-4 w-full rounded-md"></div>
                    <div className="animate-pulse bg-gray-200 h-4 w-2/3 rounded-md"></div>
                  </div>
                  <div className="animate-pulse bg-gray-200 h-8 w-1/2 rounded-md"></div>
                  <div className="flex gap-2 pt-2">
                    <div className="animate-pulse bg-gray-200 h-10 w-20 rounded-md"></div>
                    <div className="animate-pulse bg-gray-200 h-10 w-full rounded-md"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
              <GiMeat className="w-full h-full" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No products available</h3>
            <p className="text-gray-500">Contact your seller to get products assigned to your account</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
              {/* Desktop Layout - Vertical Card */}
              <div className="hidden md:block">
                {/* Product Image */}
                <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
                  <ProductImage
                    imageBase64={product.imageBase64}
                    category={product.category as 'beef' | 'chicken' | 'fish' | 'lamb'}
                    name={product.name}
                    size="xl"
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 right-3 bg-white/90 text-xs font-semibold px-3 py-1 rounded-full text-gray-700 border border-gray-200">
                    {product.unit}
                  </span>
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-700 text-white px-4 py-2 rounded-lg font-bold">Out of Stock</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">{product.description}</p>
                  
                  {/* Price Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-red-700">€{product.customerPrice?.toFixed(2)}</span>
                      <span className="text-sm text-gray-500">/ {product.unit.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Add to Cart Section */}
                  {product.inStock ? (
                    <div className="flex items-center gap-2">
                      {getCartQuantity(product.id) || editingQuantity[product.id] ? (
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="number"
                            value={editingQuantity[product.id] ? tempQuantity[product.id] || '' : getCartQuantity(product.id)}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            onFocus={() => startEditingQuantity(product.id)}
                            onBlur={() => finishEditingQuantity(product.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            min="1"
                            step="1"
                            className="w-16 text-center border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition-colors font-bold text-lg text-black"
                            placeholder="1"
                          />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // For now, just finish editing which will remove if quantity is 0
                              setTempQuantity(prev => ({ ...prev, [product.id]: '0' }));
                              finishEditingQuantity(product.id);
                            }}
                            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCartClick(e, product.id)}
                          className="flex-1 bg-red-700 hover:bg-red-800 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <FiShoppingCart className="w-5 h-5" />
                          Add to Cart
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Layout - Horizontal Card */}
              <div className="md:hidden p-4">
                <div className="flex gap-4">
                  {/* Left Section - Product Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-base text-gray-900 leading-tight">{product.name}</h3>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full text-gray-700 border border-gray-200 bg-gray-50 ml-2 shrink-0">
                        {product.unit}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">{product.description}</p>
                  </div>

                  {/* Right Section - Product Image */}
                  <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden">
                    <ProductImage
                      imageBase64={product.imageBase64}
                      category={product.category as 'beef' | 'chicken' | 'fish' | 'lamb'}
                      name={product.name}
                      size="lg"
                      className="w-full h-full"
                    />
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                        <span className="bg-red-700 text-white px-2 py-1 rounded text-xs font-bold">Out</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Section - Price and Cart Controls */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  {/* Price Section */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-red-700">€{product.customerPrice?.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">/ {product.unit.toLowerCase()}</span>
                    </div>
                  </div>

                  {/* Cart Controls */}
                  {product.inStock ? (
                    <div className="flex items-center gap-2">
                      {getCartQuantity(product.id) || editingQuantity[product.id] ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editingQuantity[product.id] ? tempQuantity[product.id] || '' : getCartQuantity(product.id)}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            onFocus={() => startEditingQuantity(product.id)}
                            onBlur={() => finishEditingQuantity(product.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            min="1"
                            step="1"
                            className="w-14 text-center border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-red-200 focus:border-red-500 transition-colors font-bold text-base text-black"
                            placeholder="1"
                          />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTempQuantity(prev => ({ ...prev, [product.id]: '0' }));
                              finishEditingQuantity(product.id);
                            }}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-xs font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCartClick(e, product.id)}
                          className="bg-red-700 hover:bg-red-800 text-white py-2 px-4 rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                          <FiShoppingCart className="w-4 h-4" />
                          <span className="text-sm">Add</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      disabled
                      className="bg-gray-300 text-gray-500 py-2 px-4 rounded-lg font-semibold cursor-not-allowed text-sm"
                    >
                      Out of Stock
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </main>

      <CustomerMobileNav currentPage="dashboard" />
    </div>
  );
}
