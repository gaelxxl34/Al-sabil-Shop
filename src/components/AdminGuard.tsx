"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import SkeletonComponents from '@/components/SkeletonLoader';

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

  if (!user || !userData || userData.role !== 'admin') {
    return null; // Redirecting
  }

  return <>{children}</>;
}
