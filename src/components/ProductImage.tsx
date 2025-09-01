// src/components/ProductImage.tsx
"use client";

import Image from "next/image";
import { GiMeat, GiChickenOven, GiFishCooked, GiSheep } from "react-icons/gi";

interface ProductImageProps {
  imageBase64?: string;
  category: 'beef' | 'chicken' | 'fish' | 'lamb';
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24'
};

const iconSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-16 h-16'
};

export default function ProductImage({ 
  imageBase64, 
  category, 
  name, 
  size = 'md', 
  className = '' 
}: ProductImageProps) {
  const getCategoryIcon = (category: string) => {
    const iconSize = iconSizeClasses[size];
    
    switch (category) {
      case 'beef':
        return <GiMeat className={`${iconSize} text-red-700`} />;
      case 'chicken':
        return <GiChickenOven className={`${iconSize} text-yellow-500`} />;
      case 'fish':
        return <GiFishCooked className={`${iconSize} text-blue-500`} />;
      case 'lamb':
        return <GiSheep className={`${iconSize} text-purple-500`} />;
      default:
        return <GiMeat className={`${iconSize} text-gray-500`} />;
    }
  };

  // Use className override if provided, otherwise use default size classes
  const containerClasses = className || `${sizeClasses[size]} bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden`;

  if (imageBase64) {
    // Handle both complete data URLs and just base64 strings
    const imageSrc = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;
      
    return (
      <div className={containerClasses}>
        <Image
          src={imageSrc}
          alt={name}
          width={size === 'sm' ? 48 : size === 'md' ? 64 : size === 'lg' ? 80 : 96}
          height={size === 'sm' ? 48 : size === 'md' ? 64 : size === 'lg' ? 80 : 96}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {getCategoryIcon(category)}
    </div>
  );
}
