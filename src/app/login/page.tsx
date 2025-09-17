"use client";

import { useState, FormEvent, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import LoadingScreen from "@/components/LoadingScreen";
import { getUserFriendlyErrorMessage } from "@/lib/error-utils";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, userData, loading, refreshAuth } = useAuth();

  // Check if user is already authenticated using our AuthProvider
  useEffect(() => {
    if (!loading && user && userData) {
      // User is already logged in, redirect to appropriate dashboard
      switch (userData.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'seller':
          router.push('/seller/dashboard');
          break;
        case 'customer':
          router.push('/customer/dashboard');
          break;
        default:
          router.push('/');
      }
    }
  }, [user, userData, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('🔐 Login: Starting login process for:', email);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies
      });

      const data = await response.json();
      console.log('🔐 Login: API response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Refresh auth state in AuthProvider to sync the new session
      console.log('🔐 Login: Refreshing auth state...');
      await refreshAuth();

      // Show success message briefly
      setError('');
      console.log('🔐 Login: Success! Redirecting to', data.role, 'dashboard');
      
      // Redirect based on user role
      switch (data.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'seller':
          router.push('/seller/dashboard');
          break;
        case 'customer':
          router.push('/customer/dashboard');
          break;
        default:
          // Fallback for unknown roles
          router.push('/');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      
      // Use the centralized error handling utility
      const userFriendlyMessage = getUserFriendlyErrorMessage(err);
      setError(userFriendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking auth state
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background image: desktop uses login.jpg, mobile uses login-mobile.png */}
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="block md:hidden relative w-full h-full">
          <Image
            src="/login-mobile.png"
            alt="Login background mobile"
            fill
            sizes="(max-width: 768px) 100vw, 0px"
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="hidden md:block relative w-full h-full">
          <Image
            src="/login.png"
            alt="Login background"
            fill
            sizes="(min-width: 769px) 100vw, 0px"
            className="object-cover object-center"
            priority
          />
        </div>
      </div>
      {/* Overlay for darkening if needed */}
      <div className="absolute inset-0 bg-black/30 z-10" aria-hidden="true" />
      {/* Login form container on the left, even smaller width */}
      <div className="relative z-20 w-full max-w-[420px] p-4 md:p-6 bg-white bg-opacity-95 rounded-lg shadow-lg border border-black m-2 md:ml-12 flex flex-col items-center">
        <div className="flex flex-col items-center mb-8 w-full">
          <Link href="/" className="block">
            <Image 
              src="/logo.png" 
              alt="Al-Ysabil Logo" 
              width={96} 
              height={96}
              priority
              className="w-auto h-auto max-w-[96px] max-h-[96px]"
            />
          </Link>
          <h1 className="mt-4 text-lg font-bold text-black">Sign in to Al-Ysabil</h1>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-500 text-red-700 rounded w-full text-sm">
            {error}
          </div>
        )}
        <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            className="px-4 py-2 border border-black rounded focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-black text-black"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="px-4 py-2 border border-black rounded focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-black text-black"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-elegant-red-600 hover:bg-black text-white font-semibold py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
        <div className="mt-6 text-center w-full">
          <Link href="/forgot-password" className="text-red-700 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
