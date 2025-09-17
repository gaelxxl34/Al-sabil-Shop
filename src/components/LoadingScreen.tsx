"use client";

import Image from "next/image";

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
  variant?: 'default' | 'minimal' | 'elegant';
}

export default function LoadingScreen({ 
  message = "Loading...", 
  showLogo = true,
  variant = 'elegant'
}: LoadingScreenProps) {
  if (variant === 'minimal') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-elegant-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
      </div>
    );
  }

  if (variant === 'default') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elegant-red-700"></div>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  // Elegant variant (default)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="flex flex-col items-center space-y-8 p-8 animate-fade-in-up">
        {showLogo && (
          <div className="relative">
            {/* Main logo with gentle pulse */}
            <div className="relative animate-gentle-pulse">
              <Image 
                src="/logo.png" 
                alt="Al-Ysabil Logo" 
                width={128} 
                height={128}
                priority
                className="w-auto h-auto max-w-[128px] max-h-[128px] drop-shadow-xl"
              />
            </div>
            
            {/* Elegant rotating rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[140px] h-[140px] border-2 border-elegant-red-600/30 border-t-elegant-red-600 rounded-full animate-spin"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[160px] h-[160px] border border-elegant-red-400/20 border-b-elegant-red-400/60 rounded-full animate-spin [animation-duration:3s] [animation-direction:reverse]"></div>
            </div>
          </div>
        )}
        
        {/* Elegant loading dots */}
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-elegant-red-600 rounded-full animate-elegant-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-elegant-red-500 rounded-full animate-elegant-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-elegant-red-400 rounded-full animate-elegant-bounce"></div>
        </div>
        
        {/* Loading message with animated progress bar */}
        <div className="text-center space-y-3">
          <p className="text-gray-700 font-medium text-lg tracking-wide">
            {message}
          </p>
          <div className="w-40 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-elegant-red-600 via-elegant-red-500 to-elegant-red-400 rounded-full animate-loading-bar"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
