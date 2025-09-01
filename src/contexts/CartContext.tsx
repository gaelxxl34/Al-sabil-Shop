// src/contexts/CartContext.tsx
"use client";

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem, CartSummary } from '@/types/cart';
import { Product } from '@/types/product';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  isHydrated: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; price: number; quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_HYDRATED'; payload: boolean };

interface CartContextType {
  state: CartState;
  addItem: (product: Product, price: number, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartSummary: () => CartSummary;
  getItemCount: () => number;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'al-sabil-cart';

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, price, quantity = 1 } = action.payload;
      const existingItemIndex = state.items.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const updatedItems = [...state.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity
        };
        return { ...state, items: updatedItems };
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `cart-${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          description: product.description || '',
          unit: product.unit,
          price: price,
          quantity: quantity,
          imageBase64: product.imageBase64,
          category: product.category as 'beef' | 'chicken' | 'fish' | 'lamb'
        };
        return { ...state, items: [...state.items, newItem] };
      }
    }
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== id)
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.id === id ? { ...item, quantity } : item
        )
      };
    }
    
    case 'CLEAR_CART':
      return { ...state, items: [] };
    
    case 'LOAD_CART':
      return { ...state, items: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_HYDRATED':
      return { ...state, isHydrated: action.payload };
    
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isLoading: false,
    isHydrated: false
  });

  // Handle client-side hydration and localStorage loading
  useEffect(() => {
    const loadCartFromStorage = () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Check if we're on the client side
        if (typeof window !== 'undefined') {
          const savedCart = localStorage.getItem(STORAGE_KEY);
          if (savedCart) {
            const cartItems = JSON.parse(savedCart);
            // Validate the cart items before loading
            if (Array.isArray(cartItems)) {
              dispatch({ type: 'LOAD_CART', payload: cartItems });
            }
          }
        }
        
        dispatch({ type: 'SET_HYDRATED', payload: true });
        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        dispatch({ type: 'SET_HYDRATED', payload: true });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadCartFromStorage();
  }, []);

  // Save cart to localStorage whenever items change (only after hydration)
  useEffect(() => {
    if (!state.isHydrated) return;
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state.items, state.isHydrated]);

  const addItem = (product: Product, price: number, quantity = 1) => {
    dispatch({ type: 'ADD_ITEM', payload: { product, price, quantity } });
  };

  const removeItem = (itemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getCartSummary = (): CartSummary => {
    const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= 100 ? 0 : 5.00; // Free delivery over €100
    const finalTotal = subtotal + deliveryFee;

    return {
      itemCount,
      subtotal,
      deliveryFee,
      finalTotal
    };
  };

  const getItemCount = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const contextValue: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getCartSummary,
    getItemCount,
    isHydrated: state.isHydrated
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
