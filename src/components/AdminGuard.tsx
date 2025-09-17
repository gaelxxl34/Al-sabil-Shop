"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import LoadingScreen from '@/components/LoadingScreen';

interface AdminGuardProps {
  children: ReactNode;
  loadingSkeleton?: ReactNode;
}

export default function AdminGuard({ children, loadingSkeleton }: AdminGuardProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  // Redirect if not admin once loaded
  useEffect(() => {
    if (!loading) {
      if (!user || !userData || userData.role !== 'admin') {
        router.replace('/login');
      }
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return loadingSkeleton || <LoadingScreen message="Verifying admin access..." variant="minimal" />;
  }

  if (!user || !userData || userData.role !== 'admin') {
    return null; // Redirecting
  }

  return <>{children}</>;
}
