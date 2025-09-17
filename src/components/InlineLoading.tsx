"use client";

import Image from "next/image";

interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showLogo?: boolean;
  className?: string;
}

export default function InlineLoading({ 
  message = "Loading...", 
  size = 'md',
  showLogo = false,
  className = ""
}: InlineLoadingProps) {
  const sizeClasses = {
    sm: {
      spinner: "w-4 h-4",
      logo: "w-8 h-8",
      text: "text-sm",
      spacing: "space-y-2"
    },
    md: {
      spinner: "w-6 h-6",
      logo: "w-12 h-12",
      text: "text-base",
      spacing: "space-y-3"
    },
    lg: {
      spinner: "w-8 h-8",
      logo: "w-16 h-16",
      text: "text-lg",
      spacing: "space-y-4"
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center ${classes.spacing} ${className}`}>
      {showLogo ? (
        <div className="relative">
          <Image 
            src="/logo.png" 
            alt="Al-Ysabil Logo" 
            width={size === 'sm' ? 32 : size === 'md' ? 48 : 64} 
            height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
            className={`${classes.logo} animate-gentle-pulse drop-shadow-md`}
          />
          <div className={`absolute inset-0 border-2 border-elegant-red-600/30 border-t-elegant-red-600 rounded-full animate-spin`}></div>
        </div>
      ) : (
        <div className={`${classes.spinner} border-2 border-elegant-red-600/30 border-t-elegant-red-600 rounded-full animate-spin`}></div>
      )}
      
      {message && (
        <p className={`text-gray-600 font-medium ${classes.text} text-center`}>
          {message}
        </p>
      )}
    </div>
  );
}
