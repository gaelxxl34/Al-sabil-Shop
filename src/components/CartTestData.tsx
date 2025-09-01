// src/components/CartTestData.tsx
"use client";

import { useCart } from "@/contexts/CartContext";
import { Product } from "@/types/product";

const sampleProducts: Product[] = [
  {
    id: "beef-ribeye-1kg",
    name: "Beef Ribeye Steak 1kg",
    description: "Premium quality ribeye steak, perfectly marbled for exceptional flavor and tenderness.",
    unit: "Tray",
    category: "beef",
    sellerId: "test-seller",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "whole-chicken-1-2kg",
    name: "Whole Chicken 1.2kg",
    description: "Fresh whole chicken, ideal for roasting or grilling. Farm-raised with no antibiotics.",
    unit: "Piece",
    category: "chicken",
    sellerId: "test-seller",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "salmon-fillet-500g",
    name: "Fresh Salmon Fillet 500g",
    description: "Wild-caught Atlantic salmon fillet, rich in omega-3 and perfect for healthy meals.",
    unit: "Pack",
    category: "fish",
    sellerId: "test-seller",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function CartTestData() {
  const { addItem, clearCart, state, isHydrated } = useCart();

  const addTestItems = () => {
    sampleProducts.forEach((product, index) => {
      const price = [45.00, 18.50, 32.00][index];
      addItem(product, price, 1);
    });
  };

  const addSingleItem = () => {
    const product = sampleProducts[0];
    addItem(product, 45.00, 1);
  };

  if (!isHydrated) {
    return (
      <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="text-xs text-gray-600">
          Cart loading...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50 max-w-xs">
      <h3 className="text-sm font-semibold mb-2">Cart Test Controls</h3>
      <div className="flex flex-col gap-2">
        <button
          onClick={addSingleItem}
          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
        >
          Add 1 Item
        </button>
        <button
          onClick={addTestItems}
          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Add 3 Items
        </button>
        <button
          onClick={clearCart}
          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
        >
          Clear Cart
        </button>
      </div>
      <div className="text-xs text-gray-600 mt-2">
        Items: {state.items.length}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Refresh page to test persistence!
      </div>
    </div>
  );
}
