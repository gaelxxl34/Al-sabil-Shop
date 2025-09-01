"use client";

import { useState, FormEvent, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is already logged in, check their role and redirect
        const userRole = document.cookie
          .split('; ')
          .find(row => row.startsWith('user-role='))
          ?.split('=')[1];
        
        if (userRole) {
          switch (userRole) {
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
          return;
        }
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Show success message briefly
      setError('');
      
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to login. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth state
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background image: desktop uses login.jpg, mobile uses login-mobile.png */}
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="block md:hidden w-full h-full">
          <Image
            src="/login-mobile.png"
            alt="Login background mobile"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="hidden md:block w-full h-full">
          <Image
            src="/login.png"
            alt="Login background"
            fill
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
            <Image src="/logo.png" alt="Al-Ysabil Logo" width={96} height={96} />
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
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            className="px-4 py-2 border border-black rounded focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-black text-black"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className={`bg-elegant-red-600 hover:bg-black text-white font-semibold py-2 rounded transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
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
