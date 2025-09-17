// src/lib/auth.ts
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserDocument } from '../types/user';
import { logAndGetUserFriendlyError } from './error-utils';

export type { UserRole } from '../types/user';
export type { UserDocument as UserData } from '../types/user';

/**
 * Sign in with email and password using Firebase Auth
 */
export const signIn = async (email: string, password: string) => {
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error('User profile not found in database');
    }

    const userData = userDocSnap.data() as UserDocument;

    // Check if user account is active
    if (userData.isActive === false) {
      throw new Error('Account has been deactivated');
    }

    // Update last login timestamp
    await updateDoc(userDocRef, {
      lastLogin: new Date().toISOString(),
    });

    // Get Firebase ID token with custom claims
    const idToken = await user.getIdToken(true); // Force refresh to get latest claims

    return {
      user: {
        uid: user.uid,
        email: user.email,
      },
      userData: {
        ...userData,
        lastLogin: new Date().toISOString(),
      },
      token: idToken,
    };
  } catch (error: unknown) {
    // Use the centralized error handling utility
    const userFriendlyMessage = logAndGetUserFriendlyError(error, 'sign-in');
    throw new Error(userFriendlyMessage);
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    await auth.signOut();
    return true;
  } catch (error: unknown) {
    console.error('Sign out error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
    throw new Error(errorMessage);
  }
};

/**
 * Logout user and redirect to login page
 * This function handles both client-side Firebase logout and server-side cookie clearing
 */
export const logout = async (router?: { push: (url: string) => void }) => {
  try {
    // Call the logout API to clear server-side cookies
    const response = await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include' // Include cookies in the request
    });
    
    if (!response.ok) {
      throw new Error('Failed to logout from server');
    }

    // Client-side Firebase logout
    await signOut();
    
    // Redirect to login page if router is provided
    if (router) {
      router.push('/login');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    
    return true;
  } catch (error: unknown) {
    console.error('Logout error:', error);
    // Even if there's an error, try to redirect to login
    if (router) {
      router.push('/login');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw error;
  }
};

/**
 * Get current user's ID token (for API authentication)
 */
export const getCurrentUserToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken(true);
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};
