"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { UserData } from '@/lib/auth';

interface AuthContextType {
  user: { uid: string; email: string } | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  error: null,
  refreshAuth: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const sessionCheckInitiated = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionCheck = useRef<number>(0);
  const SESSION_CACHE_DURATION = 30000; // Cache session for 30 seconds

  // Check for existing session with caching
  const checkSession = useCallback(async (force = false) => {
    // Only run on client side after hydration
    if (typeof window === 'undefined' || !isHydrated) {
      return;
    }
    
    const now = Date.now();
    
    // If not forced and we recently checked session, skip
    if (!force && now - lastSessionCheck.current < SESSION_CACHE_DURATION) {
      console.log('⚡ AuthProvider: Using cached session check');
      return;
    }
    
    try {
      console.log('🔍 AuthProvider: Checking session...');
      const response = await fetch('/api/auth/session', {
        credentials: 'include', // Ensure cookies are included
        cache: 'no-store', // Always get fresh session data
      });
      lastSessionCheck.current = now;
      
      if (response.ok) {
        const sessionData = await response.json();
        console.log('📊 AuthProvider: Session response:', sessionData);
        if (sessionData.authenticated && sessionData.user) {
          console.log('✅ AuthProvider: Session found for user:', sessionData.user.email, 'role:', sessionData.userData?.role);
          setUser({ uid: sessionData.user.uid, email: sessionData.user.email });
          setUserData(sessionData.userData);
          setError(null); // Clear any previous errors
        } else {
          console.log('❌ AuthProvider: No valid session found');
          setUser(null);
          setUserData(null);
          // Don't set error for normal unauthenticated state
        }
      } else {
        console.log('❌ AuthProvider: Session check failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ AuthProvider: Error details:', errorData);
        setUser(null);
        setUserData(null);
        
        // Handle specific status codes
        if (response.status === 401) {
          // Unauthorized - clear any stale auth state
          console.log('🧹 AuthProvider: Clearing stale authentication state');
        } else if (response.status >= 500) {
          // Server error - set error for display
          setError('Server error during authentication check');
        }
      }
    } catch (err) {
      console.error('❌ AuthProvider: Session check error:', err);
      
      // Check if this is a network error vs other error
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error - please check your connection');
      } else {
        setError('Session check failed');
      }
      
      setUser(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, [isHydrated]);

  useEffect(() => {
    // First effect: Handle hydration
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Second effect: Handle auth after hydration
    if (!isHydrated) return;

    // Prevent multiple session checks (even in React StrictMode)
    if (sessionCheckInitiated.current) {
      console.log('⚠️ AuthProvider: Session check already initiated, skipping...');
      return;
    }
    
    sessionCheckInitiated.current = true;
    
    // Initial session check
    checkSession(true); // Force initial check

    // NOTE: Firebase session cookies are long-lived (14 days)
    // No need for refresh tokens - users will need to re-login after expiry

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        console.log('🧹 AuthProvider: Cleaning up refresh interval');
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isHydrated, checkSession]); // Include checkSession dependency

  // Manual refresh function for when authentication state needs to be updated
  const refreshAuth = async () => {
    if (!isHydrated) return;
    
    console.log('🔄 AuthProvider: Manual auth refresh triggered');
    setLoading(true);
    setError(null);
    await checkSession(true); // Force fresh check
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('🚪 AuthProvider: Logging out...');
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      
      // Clear state regardless of API response
      setUser(null);
      setUserData(null);
      setError(null);
      
      if (response.ok) {
        console.log('✅ AuthProvider: Logout successful');
      } else {
        console.warn('⚠️ AuthProvider: Logout API call failed, but local state cleared');
      }
    } catch (err) {
      console.error('❌ AuthProvider: Logout error:', err);
      // Still clear local state even if API call fails
      setUser(null);
      setUserData(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, error, refreshAuth, logout }}>
      {isHydrated ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
