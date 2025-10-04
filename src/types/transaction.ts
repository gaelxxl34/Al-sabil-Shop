export interface Transaction {
  id: string;
  customerId: string;
  customerName: string; // Denormalized for easy display
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
  reference?: string; // Payment reference/cheque number/transfer ID
  notes?: string;
  transactionDate: string; // ISO date string
  createdAt: string;
  sellerId: string;
  createdBy: string; // User ID who recorded this transaction
}

export interface CreateTransactionInput {
  customerId: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
  reference?: string;
  notes?: string;
  transactionDate: string;
}

export interface TransactionFilters {
  customerId?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}
