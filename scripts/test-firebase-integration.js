#!/usr/bin/env node

/**
 * Firebase Integration Test Script
 * Tests basic connectivity and operations with Firebase
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

async function testFirebaseIntegration() {
  console.log('🔥 Starting Firebase Integration Test...\n');

  try {
    // Initialize Firebase
    console.log('1. Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');

    // Test connection by reading from a test collection
    console.log('\n2. Testing Firestore connection...');
    const testCollection = collection(db, 'test');
    
    // Add a test document
    console.log('   Adding test document...');
    const testDoc = {
      message: 'Firebase integration test',
      timestamp: new Date(),
      userId: 'test-user-123'
    };
    
    const docRef = await addDoc(testCollection, testDoc);
    console.log('✅ Test document added with ID:', docRef.id);

    // Read the test document back
    console.log('   Reading test documents...');
    const querySnapshot = await getDocs(testCollection);
    console.log(`✅ Found ${querySnapshot.size} test document(s)`);
    
    querySnapshot.forEach((doc) => {
      console.log(`   Document ${doc.id}:`, doc.data());
    });

    // Clean up - delete the test document
    console.log('   Cleaning up test document...');
    await deleteDoc(doc(db, 'test', docRef.id));
    console.log('✅ Test document cleaned up');

    console.log('\n🎉 All Firebase integration tests passed!');
    console.log('\n📊 Firebase Configuration Status:');
    console.log(`   Project ID: ${firebaseConfig.projectId}`);
    console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
    console.log(`   Database Region: ${firebaseConfig.projectId}.firebaseapp.com`);
    
    return true;

  } catch (error) {
    console.error('\n❌ Firebase integration test failed:');
    console.error('Error details:', error);
    
    if (error.code === 'permission-denied') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   - Make sure Firestore database is created in Firebase Console');
      console.error('   - Check that Firestore rules allow test operations');
      console.error('   - Verify that the Firebase project is properly configured');
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFirebaseIntegration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testFirebaseIntegration }; 