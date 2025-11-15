// Unified API client attaching credentials and basic admin guard behavior

import { Product, CreateProductRequest, UpdateProductRequest } from '@/types/product';
import { Customer } from '@/types/customer';
import { Order, OrderItem } from '@/types/cart';

interface ApiError extends Error {
  code?: number;
  payload?: unknown;
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    // Use session-based authentication (no need for Bearer tokens)
    const res = await fetch(url, {
      ...options,
      credentials: 'include', // This includes the session cookie
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      // Let caller handle redirect; throw a specific error
      const err = new Error('Unauthorized') as ApiError;
      err.code = 401;
      throw err;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed') as ApiError;
      err.code = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  } catch (error) {
    // If the error is a TypeError with 'Failed to fetch', it's likely a network/CORS issue
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Network error - Failed to fetch:', url);
      const err = new Error('Network error: Unable to connect to the server. Please check if the development server is running.') as ApiError;
      err.code = 0;
      throw err;
    }
    
    // Re-throw existing ApiErrors
    if (error instanceof Error && 'code' in error) {
      throw error;
    }
    
    // Wrap other errors
    console.error('API fetch error:', error);
    const err = new Error('An unexpected error occurred') as ApiError;
    err.code = 500;
    throw err;
  }
}

// Product API functions
export const productApi = {
  async getProducts(sellerId?: string): Promise<{ success: boolean; data: Product[] }> {
    const params = sellerId ? `?sellerId=${sellerId}` : '';
    return apiFetch<{ success: boolean; data: Product[] }>(`/api/products${params}`);
  },

  async getProduct(id: string): Promise<{ success: boolean; data: Product }> {
    return apiFetch<{ success: boolean; data: Product }>(`/api/products/${id}`);
  },

  async createProduct(product: CreateProductRequest): Promise<{ success: boolean; data: Product }> {
    return apiFetch<{ success: boolean; data: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  async updateProduct(id: string, updates: UpdateProductRequest): Promise<{ success: boolean; data: Product }> {
    return apiFetch<{ success: boolean; data: Product }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Customer API functions
export const customerApi = {
  async getMe(): Promise<{ success: boolean; data: { customer: Customer; products: Product[] } }> {
    return apiFetch<{ success: boolean; data: { customer: Customer; products: Product[] } }>('/api/customers/me');
  },

  async getCustomer(id: string): Promise<{ success: boolean; data: Customer }> {
    return apiFetch<{ success: boolean; data: Customer }>(`/api/customers/${id}`);
  },
};

// Order API functions
export const orderApi = {
  async getOrders(customerId?: string, sellerId?: string): Promise<{ success: boolean; data: Order[] }> {
    const params = new URLSearchParams();
    if (customerId) params.append('customerId', customerId);
    if (sellerId) params.append('sellerId', sellerId);
    const queryString = params.toString();
    const url = `/api/orders${queryString ? `?${queryString}` : ''}`;
    
    console.log('🌐 Making API request to:', url);
    
    return apiFetch<{ success: boolean; data: Order[] }>(url);
  },

  async getOrder(id: string): Promise<{ success: boolean; data: Order }> {
    return apiFetch<{ success: boolean; data: Order }>(`/api/orders/${id}`);
  },

  async createOrder(orderData: {
    customerId: string;
    sellerId: string;
    items: OrderItem[];
    deliveryAddress: string;
    deliveryDate?: string;
    paymentMethod: 'credit' | 'cash';
    notes?: string;
    subtotal: number;
    deliveryFee?: number; // Optional, defaults to 5
    tax?: number;
  }): Promise<{ success: boolean; data: Order; message: string }> {
    return apiFetch<{ success: boolean; data: Order; message: string }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async updateOrder(id: string, updates: {
    status?: Order['status'];
    paymentStatus?: Order['paymentStatus'];
    deliveryDate?: string;
    notes?: string;
    items?: OrderItem[];
    subtotal?: number;
    deliveryFee?: number;
    total?: number;
    // Payment recording fields
    paymentAmount?: number;
    paymentMethod?: 'cash' | 'bank_transfer' | 'credit' | 'other';
    paymentNotes?: string;
    // Credit note fields
    creditNoteAmount?: number;
    creditNoteReason?: 'returned_goods' | 'quality_issue' | 'wrong_items' | 'damaged_goods' | 'pricing_error' | 'customer_complaint' | 'other';
    creditNoteNotes?: string;
  }): Promise<{ success: boolean; data: Order; message: string }> {
    return apiFetch<{ success: boolean; data: Order; message: string }>(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteOrder(id: string): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/orders/${id}`, {
      method: 'DELETE',
    });
  },
};
