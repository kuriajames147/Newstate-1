// backend/diagnose.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fullDiagnostic() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           M-PESA INTEGRATION FULL DIAGNOSTIC               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Step 1: Check .env file exists
  console.log('📁 STEP 1: Checking .env file');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasConsumerKey = envContent.includes('MPESA_CONSUMER_KEY=');
    const hasConsumerSecret = envContent.includes('MPESA_CONSUMER_SECRET=');
    console.log(`   ✅ Has MPESA_CONSUMER_KEY: ${hasConsumerKey ? 'Yes' : 'No'}`);
    console.log(`   ✅ Has MPESA_CONSUMER_SECRET: ${hasConsumerSecret ? 'Yes' : 'No'}`);
  } else {
    console.log('   ❌ .env file MISSING!');
    return;
  }
  
  // Step 2: Check environment variables are loaded
  console.log('\n📋 STEP 2: Environment variables loaded');
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  
  console.log(`   MPESA_CONSUMER_KEY: ${key ? key.substring(0, 15) + '...' : '❌ MISSING'}`);
  console.log(`   MPESA_CONSUMER_SECRET: ${secret ? '✅ Present (' + secret.length + ' chars)' : '❌ MISSING'}`);
  console.log(`   MPESA_SHORTCODE: ${shortcode || '❌ MISSING'}`);
  console.log(`   MPESA_PASSKEY: ${passkey ? '✅ Present' : '❌ MISSING'}`);
  console.log(`   MPESA_CALLBACK_URL: ${callbackUrl || '❌ MISSING'}`);
  
  if (!key || !secret) {
    console.log('\n❌ CRITICAL: Credentials missing in .env file!');
    return;
  }
  
  // Step 3: Check if using placeholder values
  console.log('\n🔍 STEP 3: Checking for placeholder values');
  const placeholderIndicators = [
    'your_consumer_key',
    'your_consumer_secret',
    'xxxxxxxxxx',
    'paste_your'
  ];
  
  let isPlaceholder = false;
  for (const indicator of placeholderIndicators) {
    if (key.toLowerCase().includes(indicator) || secret.toLowerCase().includes(indicator)) {
      isPlaceholder = true;
      break;
    }
  }
  
  if (isPlaceholder) {
    console.log('   ⚠️ WARNING: You appear to be using PLACEHOLDER credentials!');
    console.log('   You need REAL credentials from Daraja dashboard.');
  } else {
    console.log('   ✅ Credentials appear to be real values');
  }
  
  // Step 4: Test authentication with Safaricom
  console.log('\n🔄 STEP 4: Testing authentication with Safaricom API');
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  
  try {
    const tokenResponse = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { 
        headers: { Authorization: `Basic ${auth}` },
        timeout: 15000
      }
    );
    
    console.log('   ✅ Authentication SUCCESSFUL!');
    console.log(`   Access Token: ${tokenResponse.data.access_token.substring(0, 30)}...`);
    console.log(`   Expires in: ${tokenResponse.data.expires_in} seconds`);
    
  } catch (error) {
    console.log('   ❌ Authentication FAILED!');
    
    if (error.response) {
      console.log(`   Status Code: ${error.response.status}`);
      console.log(`   Error:`, JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n   🔧 DIAGNOSIS: Invalid Consumer Key or Consumer Secret');
        console.log('   SOLUTION:');
        console.log('   1. Go to https://developer.safaricom.co.ke');
        console.log('   2. Login and go to "My Apps"');
        console.log('   3. Click "Create App" to make a NEW app');
        console.log('   4. Select ONLY "Lipa Na M-Pesa Sandbox"');
        console.log('   5. Copy the NEW Consumer Key and Secret');
        console.log('   6. Update your .env file');
      } else if (error.response.status === 400) {
        console.log('\n   🔧 DIAGNOSIS: The selected product may not be available');
        console.log('   SOLUTION: Make sure "Lipa Na M-Pesa Sandbox" is selected in your app');
      }
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    // Don't proceed further if authentication fails
    return;
  }
  
  // Step 5: Test Callback URL accessibility
  console.log('\n🌐 STEP 5: Testing Callback URL accessibility');
  if (callbackUrl && callbackUrl !== 'https://your-ngrok-url.ngrok.io/api/payments/callback') {
    try {
      const baseUrl = callbackUrl.replace('/api/payments/callback', '');
      const healthCheck = await axios.get(`${baseUrl}/api/health`, { timeout: 5000 });
      console.log(`   ✅ Callback URL is reachable`);
      console.log(`   Response:`, healthCheck.data);
    } catch (error) {
      console.log(`   ⚠️ Warning: Cannot reach callback URL`);
      console.log(`   Make sure your backend is running and ngrok is active`);
      console.log(`   URL tried: ${callbackUrl}`);
    }
  } else {
    console.log(`   ⚠️ Warning: Callback URL not set or still using placeholder`);
    console.log(`   Current value: ${callbackUrl || 'MISSING'}`);
  }
  
  // Step 6: Final summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    DIAGNOSTIC SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log('\n✅ Your credentials are VALID and AUTHENTICATION WORKS');
  console.log('\nIf you are still getting "wrong credentials", the issue is likely:');
  console.log('   1. The frontend is showing a cached error');
  console.log('   2. There\'s a different error being misreported as "wrong credentials"');
  console.log('   3. The M-PESA sandbox is temporarily rate-limiting you');
  console.log('\nNext steps:');
  console.log('   1. Clear your browser cache (Ctrl+Shift+Delete)');
  console.log('   2. Restart your backend server');
  console.log('   3. Wait 15 minutes (sandbox cooldown)');
  console.log('   4. Test with the activation page again');
}

fullDiagnostic();