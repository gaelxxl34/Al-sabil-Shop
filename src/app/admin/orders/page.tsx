'use client';

import SellerOrdersPage from '@/app/seller/orders/page';
import AdminGuard from '@/components/AdminGuard';

export default function AdminOrdersPage() {
  return (
    <AdminGuard>
      <SellerOrdersPage />
    </AdminGuard>
  );
}
