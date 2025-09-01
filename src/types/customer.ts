// src/types/customer.ts
export interface CustomerBranch {
  id: number;
  name: string;
  address: string;
  phone: string;
  contactPerson: string;
  email: string;
  password: string;
}

export interface CustomerProduct {
  id: number;
  productId: string;
  price: string;
  quantity: string;
  unit: string;
}

export interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  businessType: string;
  deliveryCost: number;
  sellerId: string;
  branches: CustomerBranch[];
  prices: Record<string, number>; // productId -> price
  notes: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  tempPassword?: string;
  passwordChanged: boolean;
}

export interface CreateCustomerData {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  password: string; // Required for creation
  address: string;
  businessType?: string;
  deliveryCost?: number;
  branches: CustomerBranch[];
  products: CustomerProduct[];
  notes?: string;
}

export interface UpdateCustomerData {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  password?: string; // Optional for updates
  address: string;
  businessType?: string;
  deliveryCost?: number;
  branches: CustomerBranch[];
  products: CustomerProduct[];
  notes?: string;
}
