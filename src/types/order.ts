// src/types/order.ts

export type OrderStatus = 'pending' | 'processing' | 'fulfilled' | 'cancelled';
export type FulfillmentStatus = 'full' | 'partial' | 'pending';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  // Partial fulfillment fields
  requestedQty: number; // Original order quantity
  availableQty: number; // Immediately available
  pendingQty: number; // Backordered quantity
  estimatedAvailability?: string; // e.g., "3 days", "Next delivery", "2024-10-10"
  adminNote?: string; // Notes about availability or delays
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  sellerId: string;
  items: OrderItem[];
  subtotal: number;
  tax?: number;
  shipping?: number;
  total: number;
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  paymentDueDate?: string;
  notes?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  // Messaging integration
  chatEnabled: boolean;
  conversationId?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  fulfilledAt?: string;
}

export interface CreateOrderData {
  customerId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  notes?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  paymentDueDate?: string;
}

export interface UpdateOrderData {
  status?: OrderStatus;
  fulfillmentStatus?: FulfillmentStatus;
  paymentStatus?: PaymentStatus;
  notes?: string;
  deliveryDate?: string;
  fulfilledAt?: string;
  items?: OrderItem[]; // For updating partial fulfillment
}

export interface PartialFulfillmentUpdate {
  orderId: string;
  items: {
    productId: string;
    availableQty: number;
    pendingQty: number;
    estimatedAvailability?: string;
    adminNote?: string;
  }[];
  createConversation?: boolean; // Auto-create chat for customer
}

export interface OrderStockValidation {
  isValid: boolean;
  hasStockIssues: boolean;
  issues: {
    productId: string;
    productName: string;
    requested: number;
    available: number;
    shortfall: number;
  }[];
}
