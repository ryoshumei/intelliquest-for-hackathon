#!/usr/bin/env node

/**
 * Create Test Data Script
 * Creates sample data in Firestore for manual verification
 */

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

async function createTestData() {
  console.log('🧪 Creating test data for manual verification...\n');

  try {
    // Initialize Firebase and create a test user
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    const testEmail = `demo-user-${Date.now()}@intelliquest.test`;
    const testPassword = 'TestPassword123!';
    
    console.log('👤 Creating demo user...');
    console.log(`   Email: ${testEmail}`);
    
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    const user = userCredential.user;
    
    console.log(`✅ User created with ID: ${user.uid}`);
    
    // Get ID token
    const idToken = await user.getIdToken();
    
    // Create multiple test surveys
    const surveys = [
      {
        title: '客户满意度调研',
        description: '了解客户对我们产品和服务的满意度',
        useAI: false,
        questions: [
          {
            text: '您对我们的产品满意度如何？',
            type: 'scale',
            options: ['非常不满意', '非常满意'],
            isRequired: true
          },
                     {
             text: '您会向朋友推荐我们的产品吗？',
             type: 'yes_no',
             isRequired: true
           }
        ]
      },
      {
        title: '员工工作体验调研',
        description: '收集员工对工作环境和文化的反馈',
        useAI: false,
        questions: [
                     {
             text: '您对当前工作环境的满意度？',
             type: 'multiple_choice',
             options: ['非常满意', '满意', '一般', '不满意', '非常不满意'],
             isRequired: true
           },
          {
            text: '您认为我们可以在哪些方面改进？',
            type: 'text',
            isRequired: false
          }
        ]
      },
      {
        title: '产品功能需求调研',
        description: '了解用户对新功能的需求和期望',
        useAI: false,
        questions: [
          {
            text: '您最希望我们添加什么新功能？',
            type: 'text',
            isRequired: true
          },
                     {
             text: '您使用我们产品的频率？',
             type: 'single_choice',
             options: ['每天', '每周', '每月', '偶尔'],
             isRequired: true
           }
        ]
      }
    ];
    
    console.log('\n📝 Creating demo surveys...');
    
    for (let i = 0; i < surveys.length; i++) {
      const survey = surveys[i];
      console.log(`   Creating survey ${i + 1}: "${survey.title}"`);
      
      try {
        const response = await fetch('http://localhost:3000/api/surveys', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(survey)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Survey created with ID: ${result.survey?.id}`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Failed to create survey: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`   ❌ Error creating survey: ${error.message}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Verify data was created
    console.log('\n📊 Verifying created data...');
    const listResponse = await fetch('http://localhost:3000/api/surveys', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log(`✅ Found ${data.surveys?.length || 0} surveys in database`);
      
      if (data.surveys && data.surveys.length > 0) {
        console.log('\n📋 Created surveys:');
        data.surveys.forEach((survey, index) => {
          console.log(`   ${index + 1}. ${survey.title} (${survey.questionCount} questions)`);
        });
      }
    }
    
    console.log('\n🎉 Test data creation completed!');
    console.log('\n📱 You can now verify the data in Firebase Console:');
    console.log(`   1. Go to: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
    console.log('   2. Check the "surveys" collection');
    console.log(`   3. Look for documents with ownerId: ${user.uid}`);
    console.log('\n👤 Demo user credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   User ID: ${user.uid}`);
    
    // Don't sign out or clean up - leave data for verification
    console.log('\n💡 Data has been left in Firestore for your verification.');
    
  } catch (error) {
    console.error('\n❌ Failed to create test data:', error);
  }
}

createTestData(); 