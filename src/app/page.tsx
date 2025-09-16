"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is already logged in, check their role and redirect to dashboard
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
              router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } else {
        // User is not logged in, redirect to login
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Show loading spinner while checking auth state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
    </div>
  );
}
