"use client";

// src/components/SkeletonLoader.tsx
import React from "react";

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: string;
}

export const Skeleton = ({ 
  className = "", 
  height = "h-4", 
  width = "w-full", 
  rounded = "rounded-md" 
}: SkeletonProps) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 ${height} ${width} ${rounded} ${className}`}
    ></div>
  );
};

export const SkeletonText = ({ lines = 1, className = "" }: { lines?: number, className?: string }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} height="h-4" />
      ))}
    </div>
  );
};

export const SkeletonCircle = ({ size = "h-10 w-10", className = "" }: { size?: string, className?: string }) => {
  return <Skeleton height={size} width={size} rounded="rounded-full" className={className} />;
};

export const SkeletonCard = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <Skeleton height="h-6" width="w-3/4" className="mb-4" />
      <SkeletonText lines={3} />
    </div>
  );
};

export const SkeletonTableRow = ({ cols = 4, className = "" }: { cols?: number, className?: string }) => {
  return (
    <div className={`flex items-center space-x-4 py-4 ${className}`}>
      {[...Array(cols)].map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === 0 ? "w-1/4" : i === cols - 1 ? "w-1/12" : "w-1/6"} 
          height="h-4" 
        />
      ))}
    </div>
  );
};

export const SkeletonTable = ({ 
  rows = 5, 
  cols = 4,
  showHeader = true,
  className = "" 
}: { 
  rows?: number, 
  cols?: number,
  showHeader?: boolean,
  className?: string 
}) => {
  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {showHeader && (
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <Skeleton height="h-6" width="w-1/4" />
        </div>
      )}
      <div className="divide-y divide-gray-200 px-6">
        {[...Array(rows)].map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </div>
    </div>
  );
};

export const SkeletonDashboardCards = ({ count = 4 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton height="h-12" width="w-12" rounded="rounded-lg" />
            <Skeleton height="h-5" width="w-1/2" />
          </div>
          <Skeleton height="h-8" width="w-1/3" />
        </div>
      ))}
    </div>
  );
};

const SkeletonComponents = {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonDashboardCards
};

export default SkeletonComponents;
