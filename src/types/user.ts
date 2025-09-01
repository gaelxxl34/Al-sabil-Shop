// src/types/user.ts
export type UserRole = 'admin' | 'seller' | 'customer';

export interface UserDocument {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  sellerId?: string; // For customers, reference to their seller
  createdAt: string;
  lastLogin: string;
  isActive: boolean;
  // Admin specific fields
  permissions?: string[]; // For future admin permission management
  // Seller specific fields
  companyName?: string;
  // Customer specific fields
  prices?: Record<string, number>; // productId -> custom price
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName?: string;
  role: UserRole;
  sellerId?: string;
  companyName?: string;
  isActive?: boolean;
  permissions?: string[];
}
