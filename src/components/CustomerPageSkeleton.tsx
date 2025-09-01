"use client";

import SkeletonComponents from "@/components/SkeletonLoader";

interface CustomerPageSkeletonProps {
  showTitle?: boolean;
  titleIcon?: React.ReactNode;
  titleDescription?: string;
  contentType?: 'dashboard' | 'grid' | 'list' | 'cart' | 'settings';
}

export default function CustomerPageSkeleton({ 
  showTitle = true,
  titleIcon,
  titleDescription = "",
  contentType = 'grid'
}: CustomerPageSkeletonProps) {

  const renderDashboardSkeleton = () => (
    <>
      {/* Welcome Section Skeleton */}
      <div className="mb-8 space-y-3">
        <SkeletonComponents.Skeleton height="h-10" width="w-1/2" />
        <SkeletonComponents.Skeleton height="h-6" width="w-3/4" />
        <div className="mt-4">
          <SkeletonComponents.Skeleton height="h-12" width="w-full" />
        </div>
      </div>

      {/* Search and Filter Section Skeleton */}
      <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <SkeletonComponents.Skeleton height="h-12" width="w-full lg:w-1/2" />
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <SkeletonComponents.Skeleton key={i} height="h-12" width="w-24" />
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Desktop Layout Skeleton */}
            <div className="hidden md:block">
              <SkeletonComponents.Skeleton height="h-48" width="w-full" />
              <div className="p-6 space-y-3">
                <SkeletonComponents.Skeleton height="h-6" width="w-3/4" />
                <SkeletonComponents.SkeletonText lines={2} />
                <SkeletonComponents.Skeleton height="h-8" width="w-1/2" />
                <div className="flex gap-2 pt-2">
                  <SkeletonComponents.Skeleton height="h-10" width="w-20" />
                  <SkeletonComponents.Skeleton height="h-10" width="w-full" />
                </div>
              </div>
            </div>

            {/* Mobile Layout Skeleton */}
            <div className="md:hidden p-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <SkeletonComponents.Skeleton height="h-5" width="w-3/4" />
                  <SkeletonComponents.SkeletonText lines={2} />
                </div>
                <SkeletonComponents.Skeleton height="h-20" width="w-20" />
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <SkeletonComponents.Skeleton height="h-6" width="w-20" />
                <SkeletonComponents.Skeleton height="h-8" width="w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderGridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <SkeletonComponents.Skeleton height="h-6" width="w-3/4" className="mb-4" />
          <SkeletonComponents.SkeletonText lines={3} className="mb-4" />
          <SkeletonComponents.Skeleton height="h-10" width="w-1/2" />
        </div>
      ))}
    </div>
  );

  const renderListSkeleton = () => (
    <div className="space-y-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div>
                  <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-2" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-24" />
                </div>
                <SkeletonComponents.Skeleton height="h-8" width="w-20" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="text-right">
                  <SkeletonComponents.Skeleton height="h-6" width="w-16" className="mb-1" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-12" />
                </div>
                <SkeletonComponents.Skeleton height="h-10" width="w-24" />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50">
            <SkeletonComponents.Skeleton height="h-4" width="w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderCartSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items Skeleton */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <SkeletonComponents.Skeleton height="h-6" width="w-1/3" />
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6">
                <div className="flex gap-6">
                  <SkeletonComponents.Skeleton height="h-20" width="w-20" />
                  <div className="flex-1">
                    <SkeletonComponents.Skeleton height="h-6" width="w-3/4" className="mb-2" />
                    <SkeletonComponents.SkeletonText lines={2} className="mb-3" />
                    <SkeletonComponents.Skeleton height="h-8" width="w-1/3" />
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <SkeletonComponents.Skeleton height="h-10" width="w-32" />
                    <SkeletonComponents.Skeleton height="h-6" width="w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Summary Skeleton */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
          <SkeletonComponents.Skeleton height="h-6" width="w-1/2" className="mb-6" />
          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <SkeletonComponents.Skeleton height="h-4" width="w-20" />
              <SkeletonComponents.Skeleton height="h-4" width="w-16" />
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <SkeletonComponents.Skeleton height="h-6" width="w-16" />
                <SkeletonComponents.Skeleton height="h-6" width="w-20" />
              </div>
            </div>
          </div>
          <SkeletonComponents.Skeleton height="h-12" width="w-full" className="mb-4" />
          <SkeletonComponents.Skeleton height="h-10" width="w-full" />
        </div>
      </div>
    </div>
  );

  const renderSettingsSkeleton = () => (
    <div className="space-y-6">
      {/* Profile Section Skeleton */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <SkeletonComponents.Skeleton height="h-6" width="w-32" />
          <SkeletonComponents.Skeleton height="h-8" width="w-16" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonComponents.Skeleton height="h-5" width="w-5" />
                <div>
                  <SkeletonComponents.Skeleton height="h-4" width="w-16" className="mb-1" />
                  <SkeletonComponents.Skeleton height="h-5" width="w-32" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonComponents.Skeleton height="h-5" width="w-5" />
                <div>
                  <SkeletonComponents.Skeleton height="h-4" width="w-16" className="mb-1" />
                  <SkeletonComponents.Skeleton height="h-5" width="w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Section Skeleton */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-6" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <SkeletonComponents.Skeleton height="h-5" width="w-32" className="mb-1" />
                <SkeletonComponents.Skeleton height="h-4" width="w-48" />
              </div>
              <SkeletonComponents.Skeleton height="h-6" width="w-11" />
            </div>
          ))}
        </div>
      </div>

      {/* Account Actions Skeleton */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <SkeletonComponents.Skeleton height="h-6" width="w-32" className="mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <SkeletonComponents.Skeleton height="h-5" width="w-5" />
                <div>
                  <SkeletonComponents.Skeleton height="h-5" width="w-32" className="mb-1" />
                  <SkeletonComponents.Skeleton height="h-4" width="w-40" />
                </div>
              </div>
              <SkeletonComponents.Skeleton height="h-5" width="w-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (contentType) {
      case 'dashboard':
        return renderDashboardSkeleton();
      case 'grid':
        return renderGridSkeleton();
      case 'list':
        return renderListSkeleton();
      case 'cart':
        return renderCartSkeleton();
      case 'settings':
        return renderSettingsSkeleton();
      default:
        return renderGridSkeleton();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header Skeleton */}
      <header className="hidden md:block bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SkeletonComponents.Skeleton height="h-10" width="w-32" />
              <SkeletonComponents.Skeleton height="h-8" width="w-24" />
            </div>
            <div className="flex items-center gap-4">
              <SkeletonComponents.Skeleton height="h-10" width="w-20" />
              <SkeletonComponents.Skeleton height="h-10" width="w-24" />
              <SkeletonComponents.Skeleton height="h-10" width="w-32" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header Skeleton */}
      <header className="md:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-center">
          <SkeletonComponents.Skeleton height="h-8" width="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title Skeleton */}
        {showTitle && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {titleIcon && <div className="text-red-700">{titleIcon}</div>}
              <SkeletonComponents.Skeleton height="h-10" width="w-1/3" />
            </div>
            {titleDescription && (
              <SkeletonComponents.Skeleton height="h-6" width="w-1/2" />
            )}
          </div>
        )}

        {/* Content Skeleton */}
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation Skeleton */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-4 h-16">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center p-2">
              <SkeletonComponents.Skeleton height="h-6" width="w-6" className="mb-1" />
              <SkeletonComponents.Skeleton height="h-3" width="w-12" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
