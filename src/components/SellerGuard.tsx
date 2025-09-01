"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import SkeletonComponents from '@/components/SkeletonLoader';

interface SellerGuardProps {
  children: ReactNode;
  loadingSkeleton?: ReactNode;
}

export default function SellerGuard({ children, loadingSkeleton }: SellerGuardProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  // Debug logging
  useEffect(() => {
    console.log('🔒 SellerGuard - Auth state:', {
      loading,
      user: user ? { uid: user.uid, email: user.email } : null,
      userData: userData ? { role: userData.role, uid: userData.uid, email: userData.email } : null
    });
  }, [user, userData, loading]);

  // Redirect if not seller once loaded
  useEffect(() => {
    if (!loading) {
      console.log('🔒 SellerGuard - Checking authorization...');
      if (!user || !userData || userData.role !== 'seller') {
        console.log('❌ SellerGuard - Authorization failed, redirecting to login');
        console.log('  - User exists:', !!user);
        console.log('  - UserData exists:', !!userData);
        console.log('  - UserData role:', userData?.role);
        router.replace('/login');
      } else {
        console.log('✅ SellerGuard - Authorization successful');
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        {loadingSkeleton || (
          <div className="w-full max-w-4xl space-y-6">
            <SkeletonComponents.SkeletonCard className="h-32" />
            <SkeletonComponents.SkeletonCard className="h-96" />
          </div>
        )}
      </div>
    );
  }

  if (!user || !userData || userData.role !== 'seller') {
    return null; // Redirecting
  }

  return <>{children}</>;
}
