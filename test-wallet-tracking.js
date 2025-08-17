/**
 * Test Script for Wallet Tracking with Coinbase CDP
 * Tests the wallet tracking functionality using your CDP API key
 */

const BACKEND_URL = 'http://localhost:3001';
const CDP_API_KEY = '0USnEPehKTmi0yRC4apQYawZ5QUsdhLF';

// Test wallet addresses
const testWallets = [
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // Example wallet
  '0xD880E96C35B217B9E220B69234A12AcFC175f92B'  // Merchant wallet
];

/**
 * Test 1: Test CDP API directly
 */
async function testCDPAPI() {
  console.log('\n🧪 Test 1: Testing CDP API directly...');
  
  try {
    const response = await fetch('https://api.cdp.coinbase.com/platform/v2/data/query/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CDP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: "SELECT block_number, transaction_hash FROM base.transactions WHERE block_number > 34089580 LIMIT 3"
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ CDP API working:', data.result.length, 'transactions found');
      return true;
    } else {
      console.error('❌ CDP API failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing CDP API:', error);
    return false;
  }
}

/**
 * Test 2: Test backend wallet tracking endpoints
 */
async function testBackendEndpoints() {
  console.log('\n🧪 Test 2: Testing backend wallet tracking endpoints...');
  
  try {
    // Test the test endpoint
    const testResponse = await fetch(`${BACKEND_URL}/api/wallet/test`);
    if (testResponse.ok) {
      const testResult = await testResponse.json();
      console.log('✅ Backend wallet tracking endpoints working:', testResult.message);
    } else {
      console.error('❌ Backend test endpoint failed');
      return false;
    }

    // Test wallet activity for first test wallet
    const walletAddress = testWallets[0];
    console.log(`\n🔍 Testing wallet activity for: ${walletAddress}`);
    
    const activityResponse = await fetch(`${BACKEND_URL}/api/wallet/${walletAddress}/activity?limit=5`);
    if (activityResponse.ok) {
      const activityResult = await activityResponse.json();
      console.log('✅ Wallet activity retrieved:', activityResult.activity.transactions.length, 'transactions');
      console.log('   Total received:', activityResult.activity.totalReceived);
      console.log('   Total sent:', activityResult.activity.totalSent);
    } else {
      console.error('❌ Wallet activity endpoint failed');
    }

    // Test wallet balance
    const balanceResponse = await fetch(`${BACKEND_URL}/api/wallet/${walletAddress}/balance`);
    if (balanceResponse.ok) {
      const balanceResult = await balanceResponse.json();
      console.log('✅ Wallet balance retrieved:', balanceResult.balance);
    } else {
      console.error('❌ Wallet balance endpoint failed');
    }

    // Test recent activity check
    const recentResponse = await fetch(`${BACKEND_URL}/api/wallet/${walletAddress}/recent-activity?minutes=10`);
    if (recentResponse.ok) {
      const recentResult = await recentResponse.json();
      console.log('✅ Recent activity check:', recentResult.hasRecentActivity);
    } else {
      console.error('❌ Recent activity endpoint failed');
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing backend endpoints:', error);
    return false;
  }
}

/**
 * Test 3: Test USDC transaction tracking
 */
async function testUSDCTracking() {
  console.log('\n🧪 Test 3: Testing USDC transaction tracking...');
  
  try {
    const walletAddress = testWallets[0];
    
    const response = await fetch(`${BACKEND_URL}/api/wallet/${walletAddress}/transactions?token=usdc&limit=5`);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ USDC transactions retrieved:', result.transactions.length, 'transactions');
      
      if (result.transactions.length > 0) {
        console.log('   Latest transaction:', {
          hash: result.transactions[0].transactionHash.substring(0, 10) + '...',
          from: result.transactions[0].from.substring(0, 10) + '...',
          to: result.transactions[0].to.substring(0, 10) + '...',
          value: result.transactions[0].value,
          token: result.transactions[0].token
        });
      }
    } else {
      console.error('❌ USDC tracking failed');
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing USDC tracking:', error);
    return false;
  }
}

/**
 * Test 4: Test payment verification
 */
async function testPaymentVerification() {
  console.log('\n🧪 Test 4: Testing payment verification...');
  
  try {
    const verificationData = {
      fromAddress: testWallets[0],
      toAddress: testWallets[1],
      amount: '25.50',
      token: 'USDC',
      minutes: 10
    };

    const response = await fetch(`${BACKEND_URL}/api/wallet/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verificationData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Payment verification result:', {
        verified: result.paymentVerified,
        hasRecentActivity: result.hasRecentActivity,
        message: result.message
      });
    } else {
      console.error('❌ Payment verification failed');
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing payment verification:', error);
    return false;
  }
}

/**
 * Test 5: Test stored activity
 */
async function testStoredActivity() {
  console.log('\n🧪 Test 5: Testing stored activity...');
  
  try {
    const walletAddress = testWallets[0];
    
    const response = await fetch(`${BACKEND_URL}/api/wallet/${walletAddress}/stored-activity?limit=10`);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Stored activity retrieved:', result.count, 'transactions');
    } else {
      console.error('❌ Stored activity failed');
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing stored activity:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting wallet tracking tests...\n');
  
  const tests = [
    { name: 'CDP API', fn: testCDPAPI },
    { name: 'Backend Endpoints', fn: testBackendEndpoints },
    { name: 'USDC Tracking', fn: testUSDCTracking },
    { name: 'Payment Verification', fn: testPaymentVerification },
    { name: 'Stored Activity', fn: testStoredActivity }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test ${test.name} failed with error:`, error);
      failed++;
    }
  }

  console.log('\n🎉 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  console.log('\n📋 Available Endpoints:');
  console.log('• GET /api/wallet/test - Test endpoint');
  console.log('• GET /api/wallet/:address/activity - Get wallet activity');
  console.log('• GET /api/wallet/:address/transactions - Get transactions');
  console.log('• GET /api/wallet/:address/balance - Get wallet balance');
  console.log('• GET /api/wallet/:address/recent-activity - Check recent activity');
  console.log('• GET /api/wallet/:address/stored-activity - Get stored activity');
  console.log('• POST /api/wallet/verify-payment - Verify payment');

  console.log('\n🔗 Example Usage:');
  console.log(`curl -X GET "${BACKEND_URL}/api/wallet/${testWallets[0]}/activity"`);
  console.log(`curl -X GET "${BACKEND_URL}/api/wallet/${testWallets[0]}/transactions?token=usdc&limit=5"`);
  console.log(`curl -X GET "${BACKEND_URL}/api/wallet/${testWallets[0]}/balance"`);
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  runAllTests().catch(console.error);
} else {
  // Browser environment
  console.log('🌐 Running in browser - use runAllTests() to start tests');
  window.runAllTests = runAllTests;
}
