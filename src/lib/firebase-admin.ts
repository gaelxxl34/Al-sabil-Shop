// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
// NOTE: This module must only be imported in Node.js runtime (route handlers, scripts),
// never in Edge middleware/components. Avoid importing it from middleware.
// It uses Node core modules (fs/path) which are unsupported in Edge.
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin app
let adminApp: App;

if (getApps().length === 0) {
  try {
    console.log('🔧 Initializing Firebase Admin...');
    
    // Check for required environment variables
    if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
      throw new Error('FIREBASE_ADMIN_PROJECT_ID environment variable is required');
    }

    // Option 1: Using service account file path (for development only)
    const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
    if (keyPath && fs.existsSync(keyPath)) {
      console.log('📁 Using service account file');
      adminApp = initializeApp({
        credential: cert(keyPath),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      });
    }
    // Option 2: Using environment variables (recommended for production)
    else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      console.log('🔑 Using environment variables for service account');
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      });
    }
    else {
      throw new Error(`
Firebase Admin credentials not found. Please set environment variables:
- FIREBASE_ADMIN_PROJECT_ID
- FIREBASE_ADMIN_CLIENT_EMAIL  
- FIREBASE_ADMIN_PRIVATE_KEY

For development, you can alternatively set:
- FIREBASE_ADMIN_KEY_PATH (path to service account file)
        `);
    }
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    throw error;
  }
} else {
  adminApp = getApps()[0];
}

// Export Firebase Admin services
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

// Utility function to verify ID token
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

export default adminApp;
