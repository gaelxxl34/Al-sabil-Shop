// src/components/SellerSidebarDrawer.tsx
"use client";

import SellerSidebar from "./SellerSidebar";

export default function SellerSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      <SellerSidebar onClose={onClose} />
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
    </div>
  );
}
