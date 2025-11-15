// src/types/cart.ts

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  description: string;
  unit: string;
  price: number;
  quantity: number;
  imageBase64?: string;
  category: 'beef' | 'chicken' | 'fish' | 'lamb';
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  finalTotal: number;
}

export interface CheckoutData {
  customerId: string;
  items: CartItem[];
  deliveryAddress: string;
  deliveryDate?: string;
  paymentMethod: 'credit' | 'cash';
  notes?: string;
  summary: CartSummary;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: 'cash' | 'bank_transfer' | 'credit' | 'other';
  notes?: string;
  createdBy: string; // seller ID who recorded the payment
  createdAt: string;
}

export interface CreditNote {
  id: string;
  amount: number;
  reason: 'returned_goods' | 'quality_issue' | 'wrong_items' | 'damaged_goods' | 'pricing_error' | 'customer_complaint' | 'other';
  notes?: string;
  date: string;
  createdBy: string; // seller ID who issued the credit note
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  sellerId: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  paymentMethod: 'credit' | 'cash';
  subtotal: number;
  deliveryFee: number;
  total: number;
  originalTotal?: number; // Original total before credit notes
  totalCreditNotes?: number; // Total amount of credit notes issued
  totalPaid: number; // Total amount paid so far
  remainingAmount: number; // Remaining amount to be paid
  payments: PaymentRecord[]; // Array of payment records
  creditNotes?: CreditNote[]; // Array of credit notes issued
  deliveryAddress: string;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
}
