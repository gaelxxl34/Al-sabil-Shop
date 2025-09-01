#!/usr/bin/env tsx
// scripts/createAdmin.ts
import * as dotenv from 'dotenv';
import { createInterface } from 'readline';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';
import { CreateUserData, UserDocument, UserRole } from '../src/types/user';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface AdminConfig {
  email: string;
  password: string;
  displayName: string;
  permissions: string[];
}

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input with validation
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get admin configuration from user input
 */
async function getAdminConfig(): Promise<AdminConfig> {
  console.log('🏗️  Al-Sabil Admin User Creation Script');
  console.log('=====================================\n');
  console.log('Please provide the admin user details:\n');

  // Get email
  let email = '';
  while (!email || !isValidEmail(email)) {
    email = await prompt('📧 Admin Email: ');
    if (!isValidEmail(email)) {
      console.log('❌ Please enter a valid email address');
    }
  }

  // Get password with validation
  let password = '';
  while (password.length < 6) {
    password = await prompt('🔐 Admin Password (min 6 characters): ');
    if (password.length < 6) {
      console.log('❌ Password must be at least 6 characters long');
    }
  }

  // Get display name
  let displayName = '';
  while (!displayName || displayName.trim().length < 2) {
    displayName = await prompt('👤 Admin Display Name: ');
    if (!displayName || displayName.trim().length < 2) {
      console.log('❌ Display name must be at least 2 characters');
    }
  }

  // Default admin permissions
  const permissions = [
    'manage_users',
    'manage_products', 
    'manage_orders',
    'view_analytics',
    'system_settings'
  ];

  return {
    email: email.trim().toLowerCase(),
    password: password.trim(),
    displayName: displayName.trim(),
    permissions
  };
}

/**
 * Create an admin user with Firebase Authentication and Firestore
 */
async function createAdminUser(adminConfig: AdminConfig): Promise<void> {
  try {
    console.log('\n🚀 Starting admin user creation...');
    
    // Step 1: Create Firebase Authentication user
    console.log('1️⃣  Creating Firebase Auth user...');
    const userRecord = await adminAuth.createUser({
      email: adminConfig.email,
      password: adminConfig.password,
      displayName: adminConfig.displayName,
      emailVerified: true, // Auto-verify admin email
    });
    
    console.log(`✅ Firebase Auth user created with UID: ${userRecord.uid}`);

    // Step 2: Set custom claims for role-based access
    console.log('2️⃣  Setting custom claims...');
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'admin' as UserRole,
      permissions: adminConfig.permissions,
    });
    
    console.log('✅ Custom claims set successfully');

    // Step 3: Create Firestore user document in users collection
    console.log('3️⃣  Creating user document in users collection...');
    const userData: UserDocument = {
      uid: userRecord.uid,
      email: adminConfig.email,
      displayName: adminConfig.displayName,
      role: 'admin' as UserRole,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true,
      permissions: adminConfig.permissions,
    };

    await adminDb.collection('users').doc(userRecord.uid).set(userData);
    console.log('✅ Firestore user document created in users collection');

    console.log('\n🎉 Admin user created successfully!');
    console.log('📋 Login Credentials:');
    console.log(`   📧 Email: ${adminConfig.email}`);
    console.log(`   🔐 Password: ${adminConfig.password}`);
    console.log(`   👤 Name: ${adminConfig.displayName}`);
    console.log(`   🛡️  Role: admin`);
    console.log(`   🆔 UID: ${userRecord.uid}`);
    console.log('\n⚠️  IMPORTANT: This admin will have forever login capability');
    console.log('🔐 Please change the password after first login for security');

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      console.log('💡 User with this email already exists. Updating existing user...');
      await updateExistingAdminUser(adminConfig);
    } else {
      throw error;
    }
  }
}

/**
 * Update existing user to admin role
 */
async function updateExistingAdminUser(adminConfig: AdminConfig): Promise<void> {
  try {
    // Get existing user
    const userRecord = await adminAuth.getUserByEmail(adminConfig.email);
    console.log(`📝 Found existing user: ${userRecord.uid}`);

    // Update custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'admin' as UserRole,
      permissions: adminConfig.permissions,
    });

    // Update Firestore document
    const userData: Partial<UserDocument> = {
      role: 'admin' as UserRole,
      displayName: adminConfig.displayName,
      permissions: adminConfig.permissions,
      lastLogin: new Date().toISOString(),
      isActive: true,
    };

    await adminDb.collection('users').doc(userRecord.uid).update(userData);
    console.log('✅ User updated to admin role in users collection');

    console.log('✅ Existing user updated to admin successfully!');
    console.log(`📧 Email: ${adminConfig.email}`);
    console.log(`🆔 UID: ${userRecord.uid}`);

  } catch (error) {
    console.error('❌ Error updating existing user:', error);
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Get admin configuration from user input
    const adminConfig = await getAdminConfig();
    
    console.log('\n🔍 Confirming admin details:');
    console.log(`📧 Email: ${adminConfig.email}`);
    console.log(`👤 Name: ${adminConfig.displayName}`);
    console.log(`🔑 Permissions: ${adminConfig.permissions.join(', ')}`);
    
    const confirm = await prompt('\n✅ Create admin user with these details? (y/N): ');
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Admin creation cancelled');
      rl.close();
      process.exit(0);
    }

    console.log('\n🚀 Creating admin user...');
    await createAdminUser(adminConfig);

    console.log('\n✨ Script completed successfully!');
    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n💥 Script failed:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { createAdminUser };
