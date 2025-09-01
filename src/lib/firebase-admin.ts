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
    
    // Option 1: Using service account file path (recommended for development)
    const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
    if (keyPath && fs.existsSync(keyPath)) {
      console.log('📁 Using service account file:', keyPath);
      adminApp = initializeApp({
        credential: cert(keyPath),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
    // Option 2: Using environment variables
    else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      console.log('🔑 Using environment variables for service account');
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
    // Option 3: Try alternative file paths
    else {
      const alternativePaths = [
        './config/firebase-admin-key.json',
  // Guard use of process.cwd() in case of accidental Edge bundling
  (typeof process !== 'undefined' ? path.join(process.cwd(), 'config/firebase-admin-key.json') : ''),
  (typeof process !== 'undefined' ? path.join(process.cwd(), 'al-sabil-ordeing-app-firebase-adminsdk.json') : ''),
      ];
      
      let foundFile = null;
      for (const filePath of alternativePaths) {
        if (fs.existsSync(filePath)) {
          foundFile = filePath;
          break;
        }
      }
      
      if (foundFile) {
        console.log('📁 Using service account file found at:', foundFile);
        adminApp = initializeApp({
          credential: cert(foundFile),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        throw new Error(`
Firebase Admin credentials not found. Please ensure one of the following:

1. Set environment variables:
   - FIREBASE_ADMIN_PROJECT_ID
   - FIREBASE_ADMIN_CLIENT_EMAIL  
   - FIREBASE_ADMIN_PRIVATE_KEY

2. Set file path:
   - FIREBASE_ADMIN_KEY_PATH

3. Place service account file at:
   - ./config/firebase-admin-key.json

Available files: ${alternativePaths.map(p => `${p} (${fs.existsSync(p) ? 'EXISTS' : 'NOT FOUND'})`).join(', ')}
        `);
      }
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
