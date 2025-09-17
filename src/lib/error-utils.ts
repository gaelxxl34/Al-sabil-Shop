// src/lib/error-utils.ts

/**
 * Converts technical error messages (especially Firebase errors) into user-friendly messages
 * @param error - The error object or message
 * @returns A user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  let errorMessage = 'An unexpected error occurred. Please try again.';
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Handle authentication errors
    if (message.includes('no account found') || message.includes('user not found')) {
      return 'No account found with this email address.';
    }
    
    if (message.includes('incorrect') || message.includes('invalid') || 
        message.includes('wrong password') || message.includes('auth/invalid-credential')) {
      return 'Incorrect email or password. Please try again.';
    }
    
    if (message.includes('deactivated') || message.includes('inactive') || 
        message.includes('disabled') || message.includes('auth/user-disabled')) {
      return 'Your account has been deactivated. Please contact support.';
    }
    
    if (message.includes('too many requests') || message.includes('too many failed') || 
        message.includes('rate limit') || message.includes('auth/too-many-requests')) {
      return 'Too many login attempts. Please wait a few minutes and try again.';
    }
    
    if (message.includes('network') || message.includes('connection') || 
        message.includes('timeout') || message.includes('auth/network-request-failed')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (message.includes('server error') || message.includes('internal error')) {
      return 'Server error. Please try again later.';
    }
    
    if (message.includes('email and password are required')) {
      return 'Please enter both email and password.';
    }
    
    if (message.includes('valid email') || message.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    
    if (message.includes('weak password') || message.includes('auth/weak-password')) {
      return 'Password is too weak. Please choose a stronger password.';
    }
    
    if (message.includes('email already in use') || message.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists.';
    }
    
    if (message.includes('operation not allowed') || message.includes('auth/operation-not-allowed')) {
      return 'This operation is not allowed. Please contact support.';
    }

    // Filter out technical Firebase errors and other technical messages
    if (
      message.includes('firebase:') ||
      message.includes('auth/') ||
      message.includes('error (') ||
      message.includes('code:') ||
      message.includes('uid') ||
      message.includes('token') ||
      message.includes('credential') ||
      message.includes('firestore') ||
      message.includes('admin') ||
      error.message.length > 150 // Very long messages are likely technical
    ) {
      return 'An error occurred. Please try again.';
    }
    
    // If the error message seems user-friendly (short and doesn't contain technical terms), use it
    if (error.message.length < 100 && !message.includes('stack') && !message.includes('trace')) {
      return error.message;
    }
  }
  
  return errorMessage;
}

/**
 * Specifically handles Firebase Auth error codes and converts them to user-friendly messages
 * @param firebaseError - Firebase error with code property
 * @returns User-friendly error message
 */
export function getFirebaseAuthErrorMessage(firebaseError: { code?: string; message?: string }): string {
  if (!firebaseError.code) {
    return getUserFriendlyErrorMessage(firebaseError.message);
  }

  switch (firebaseError.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Please try again.';
    
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    
    case 'auth/timeout':
      return 'Request timed out. Please try again.';
    
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    
    case 'auth/operation-not-allowed':
      return 'Email/password authentication is not enabled. Please contact support.';
    
    case 'auth/requires-recent-login':
      return 'For security reasons, please log in again to continue.';
    
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    
    case 'auth/invalid-verification-code':
      return 'Invalid verification code. Please try again.';
    
    case 'auth/invalid-verification-id':
      return 'Invalid verification. Please try again.';
    
    case 'auth/missing-email':
      return 'Please enter your email address.';
    
    case 'auth/missing-password':
      return 'Please enter your password.';
    
    default:
      return 'Login failed. Please check your email and password and try again.';
  }
}

/**
 * Logs error details for debugging while returning a user-friendly message
 * @param error - The error to log and convert
 * @param context - Additional context for the error (e.g., 'login', 'signup')
 * @returns User-friendly error message
 */
export function logAndGetUserFriendlyError(error: unknown, context?: string): string {
  // Log the full error for debugging
  console.error(`${context ? `[${context}] ` : ''}Error:`, error);
  
  // Return user-friendly message
  return getUserFriendlyErrorMessage(error);
}
