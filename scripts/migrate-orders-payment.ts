// Migration script to add payment tracking fields to existing orders
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../config/firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://al-sabil-ordering-app-default-rtdb.firebaseio.com/"
  });
}

const db = admin.firestore();

async function migrateOrders() {
  try {
    console.log('🚀 Starting order migration for payment tracking...');
    
    // Get all orders
    const ordersSnapshot = await db.collection('orders').get();
    
    if (ordersSnapshot.empty) {
      console.log('📦 No orders found to migrate');
      return;
    }
    
    console.log(`📦 Found ${ordersSnapshot.size} orders to migrate`);
    
    const batch = db.batch();
    let migratedCount = 0;
    
    ordersSnapshot.docs.forEach((doc) => {
      const orderData = doc.data();
      
      // Skip if already migrated (has payment tracking fields)
      if (orderData.totalPaid !== undefined || orderData.remainingAmount !== undefined) {
        console.log(`⏭️  Skipping order ${doc.id} - already migrated`);
        return;
      }
      
      // Calculate payment fields based on current payment status
      let totalPaid = 0;
      let remainingAmount = orderData.total || 0;
      let payments: any[] = [];
      let paymentStatus = orderData.paymentStatus || 'pending';
      
      // If order was marked as paid, create a payment record
      if (paymentStatus === 'paid') {
        totalPaid = orderData.total || 0;
        remainingAmount = 0;
        
        // Create a payment record for the full amount
        payments = [{
          id: `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: totalPaid,
          date: orderData.updatedAt || orderData.createdAt || new Date().toISOString(),
          method: orderData.paymentMethod === 'credit' ? 'credit' : 'cash',
          notes: 'Migrated payment record - order was previously marked as paid',
          createdBy: orderData.sellerId || 'system',
          createdAt: orderData.updatedAt || orderData.createdAt || new Date().toISOString(),
        }];
      }
      
      // Update the order with new payment tracking fields
      const updateData = {
        totalPaid,
        remainingAmount,
        payments,
        // Ensure paymentStatus is valid (add 'partial' to old orders if needed)
        paymentStatus: ['pending', 'paid', 'overdue'].includes(paymentStatus) ? paymentStatus : 'pending'
      };
      
      batch.update(doc.ref, updateData);
      migratedCount++;
      
      console.log(`✅ Prepared migration for order ${doc.id}: totalPaid=${totalPaid}, remaining=${remainingAmount}, status=${paymentStatus}`);
    });
    
    if (migratedCount > 0) {
      console.log(`💾 Committing ${migratedCount} order updates...`);
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} orders`);
    } else {
      console.log('📦 No orders needed migration - all already up to date');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run migration if this script is called directly
if (require.main === module) {
  migrateOrders()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateOrders };
