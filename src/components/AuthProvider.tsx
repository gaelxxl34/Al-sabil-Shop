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
      const response = await fetch('/api/auth/session');
      lastSessionCheck.current = now;
      
      if (response.ok) {
        const sessionData = await response.json();
        console.log('📊 AuthProvider: Session response:', sessionData);
        if (sessionData.user) {
          console.log('✅ AuthProvider: Session found for user:', sessionData.user.email, 'role:', sessionData.userData?.role);
          setUser({ uid: sessionData.user.uid, email: sessionData.user.email });
          setUserData(sessionData.userData);
        } else {
          console.log('❌ AuthProvider: No valid session found');
          setUser(null);
          setUserData(null);
        }
      } else {
        console.log('❌ AuthProvider: Session check failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ AuthProvider: Error details:', errorData);
        setUser(null);
        setUserData(null);
      }
    } catch (err) {
      console.error('❌ AuthProvider: Session check error:', err);
      setError('Session check failed');
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

    // Auto-refresh session every 24 hours to maintain "forever" login
    if (!refreshIntervalRef.current) {
      refreshIntervalRef.current = setInterval(async () => {
        try {
          console.log('🔄 AuthProvider: Refreshing session...');
          const response = await fetch('/api/auth/refresh', { 
            method: 'POST',
            credentials: 'include'
          });
          if (response.ok) {
            console.log('✅ AuthProvider: Session refreshed successfully');
          } else {
            console.warn('⚠️ AuthProvider: Session refresh failed');
          }
        } catch (err) {
          console.error('❌ AuthProvider: Session refresh error:', err);
        }
      }, 24 * 60 * 60 * 1000); // Refresh every 24 hours
    }

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
