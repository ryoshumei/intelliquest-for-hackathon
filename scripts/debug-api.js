#!/usr/bin/env node

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const fetch = require('node-fetch').default || require('node-fetch');

require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

async function debugAPI() {
  try {
    // Initialize Firebase and create a test user
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    const testEmail = `debug-${Date.now()}@test.com`;
    const testPassword = 'TestPass123!';
    
    console.log('Creating test user...');
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const user = userCredential.user;
    
    console.log('Getting ID token...');
    const idToken = await user.getIdToken();
    
    console.log('Token preview:', idToken.substring(0, 50) + '...');
    
    // Test API call
    console.log('Making API call...');
    const response = await fetch('http://localhost:3000/api/surveys', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    // Try to decode the token to see its structure
    console.log('\nToken analysis:');
    const parts = idToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Token payload:', JSON.stringify(payload, null, 2));
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugAPI(); 