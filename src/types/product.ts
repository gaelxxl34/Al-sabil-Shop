// src/types/product.ts

export interface Product {
  id: string;
  name: string;
  unit: string;
  description: string;
  category: string;
  sellerId: string;
  imageBase64?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  unit: string;
  category: 'beef' | 'chicken' | 'fish' | 'lamb';
  description?: string;
  imageBase64?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
}
