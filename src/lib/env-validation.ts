// Environment validation utility
// This ensures all required environment variables are present before the app starts

const requiredEnvVars = {
  // Firebase Client Config (Public)
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  
  // Firebase Admin Config (Server-side only)
  FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  
  // JWT Secret
  JWT_SECRET: process.env.JWT_SECRET,
};

const optionalEnvVars = {
  // Optional in development, required in production
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  FIREBASE_ADMIN_KEY_PATH: process.env.FIREBASE_ADMIN_KEY_PATH,
};

export function validateEnvironment() {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missing.push(key);
    }
  }

  // Check optional variables that are important for production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      missing.push('NEXT_PUBLIC_BASE_URL (required for production)');
    }
  } else {
    // Development warnings
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      warnings.push('NEXT_PUBLIC_BASE_URL not set - invoices and reports may not work correctly');
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  console.log('✅ Environment validation passed');
}

export function getBaseUrl(): string {
  // In production, NEXT_PUBLIC_BASE_URL must be set
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      throw new Error('NEXT_PUBLIC_BASE_URL is required in production');
    }
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // In development, allow fallback to localhost
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export function getCookieDomain(): string | undefined {
  return process.env.COOKIE_DOMAIN || undefined;
}

// Validate on import (server-side only)
if (typeof window === 'undefined') {
  validateEnvironment();
}
