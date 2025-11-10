export interface Transaction {
  id: string;
  customerId: string;
  customerName: string; // Denormalized for easy display
  amount: number;
  type: 'payment' | 'credit_note'; // Transaction type: payment (positive) or credit note (negative)
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'credit_note' | 'other';
  reference?: string; // Payment reference/cheque number/transfer ID
  notes?: string;
  transactionDate: string; // ISO date string
  createdAt: string;
  sellerId: string;
  createdBy: string; // User ID who recorded this transaction
  relatedOrderId?: string; // For credit notes, the order related to the return
}

export interface CreateTransactionInput {
  customerId: string;
  amount: number;
  type?: 'payment' | 'credit_note'; // Defaults to 'payment'
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'credit_note' | 'other';
  reference?: string;
  notes?: string;
  transactionDate: string;
  relatedOrderId?: string;
}

export interface TransactionFilters {
  customerId?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}
