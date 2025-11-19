'use client';

import SellerProducts from '@/app/seller/products/page';
import AdminGuard from '@/components/AdminGuard';

export default function AdminProductsPage() {
  return (
    <AdminGuard>
      <SellerProducts />
    </AdminGuard>
  );
}
