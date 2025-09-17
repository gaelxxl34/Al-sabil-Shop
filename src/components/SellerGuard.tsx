"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import SkeletonComponents from '@/components/SkeletonLoader';
import LoadingScreen from '@/components/LoadingScreen';

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
    return loadingSkeleton || <LoadingScreen message="Verifying seller access..." variant="minimal" />;
  }

  if (!user || !userData || userData.role !== 'seller') {
    return null; // Redirecting
  }

  return <>{children}</>;
}
