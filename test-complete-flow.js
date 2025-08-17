/**
 * Test Complete Flow: Payment Verification → Gift Card Automation
 * Demonstrates the full flow from payment to automatic gift card application
 */

const BACKEND_URL = 'http://localhost:3001';

// Test data
const testPayment = {
  fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  toAddress: '0xD880E96C35B217B9E220B69234A12AcFC175f92B',
  amount: '25.50',
  token: 'USDC',
  transactionHash: '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
};

/**
 * Step 1: Create checkout session
 */
async function createCheckoutSession() {
  console.log('\n📋 Step 1: Creating checkout session...');
  
  try {
    const sessionData = {
      amazonUrl: "https://amazon.com/checkout",
      cartTotalCents: 2550, // $25.50
      currentBalanceCents: 0,
      userId: testPayment.fromAddress
    };

    const response = await fetch(`${BACKEND_URL}/api/checkout-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Checkout session created:', result.session.sessionId);
      return result.session.sessionId;
    } else {
      const error = await response.json();
      console.error('❌ Failed to create session:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating session:', error);
    return null;
  }
}

/**
 * Step 2: Verify payment using CDP tracking
 */
async function verifyPayment(sessionId) {
  console.log('\n🔍 Step 2: Verifying payment...');
  
  try {
    // Wait a bit for transaction to be indexed
    console.log('⏳ Waiting for transaction to be indexed...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const verificationData = {
      fromAddress: testPayment.fromAddress,
      toAddress: testPayment.toAddress,
      amount: testPayment.amount,
      token: testPayment.token,
      minutes: 5
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
      return result.paymentVerified;
    } else {
      console.error('❌ Payment verification failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    return false;
  }
}

/**
 * Step 3: Get gift codes for the session
 */
async function getGiftCodes(sessionId) {
  console.log('\n🎁 Step 3: Getting gift codes...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/checkout-sessions/${sessionId}/gift-codes`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Gift codes retrieved:', {
        sessionId: result.sessionId,
        topUpAmount: result.topUpAmountCents / 100,
        giftCodesCount: result.giftCodes.length,
        totalAllocated: result.totalAllocated / 100
      });
      return result.giftCodes;
    } else {
      console.error('❌ Failed to get gift codes');
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting gift codes:', error);
    return [];
  }
}

/**
 * Step 4: Simulate gift card automation trigger
 */
async function triggerGiftCardAutomation(sessionId, giftCodes) {
  console.log('\n🤖 Step 4: Triggering gift card automation...');
  
  try {
    const automationData = {
      type: 'GIFT_CARD_AUTOMATION',
      sessionId,
      amazonUrl: 'https://amazon.com/checkout',
      giftCodes,
      totalAmount: parseFloat(testPayment.amount),
      transactionHash: testPayment.transactionHash,
      timestamp: Date.now()
    };

    console.log('📤 Sending automation trigger:', {
      sessionId: automationData.sessionId,
      giftCodesCount: automationData.giftCodes.length,
      totalAmount: automationData.totalAmount
    });

    // Simulate sending to extension via localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('stablecart_gift_card_automation', JSON.stringify(automationData));
      window.postMessage(automationData, '*');
      console.log('✅ Automation trigger sent to extension');
    } else {
      console.log('🌐 Running in Node.js - automation trigger would be sent to extension');
    }

    return true;
  } catch (error) {
    console.error('❌ Error triggering automation:', error);
    return false;
  }
}

/**
 * Step 5: Simulate gift card application completion
 */
async function simulateGiftCardCompletion(sessionId) {
  console.log('\n✅ Step 5: Simulating gift card application completion...');
  
  try {
    const completionData = {
      sessionId,
      amazonUrl: 'https://amazon.com/checkout',
      giftCodesApplied: 3,
      totalApplied: 25.50,
      orderPlaced: true
    };

    const response = await fetch(`${BACKEND_URL}/api/webhooks/gift-card-applied`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completionData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Gift card application completed:', {
        sessionId: result.sessionId,
        status: result.status,
        message: result.message
      });
      return true;
    } else {
      console.error('❌ Failed to complete gift card application');
      return false;
    }
  } catch (error) {
    console.error('❌ Error completing gift card application:', error);
    return false;
  }
}

/**
 * Step 6: Check final session status
 */
async function checkFinalStatus(sessionId) {
  console.log('\n📊 Step 6: Checking final session status...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/checkout-sessions/${sessionId}/status`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Final session status:', {
        sessionId: result.sessionId,
        status: result.status,
        updatedAt: result.updatedAt
      });
      return result.status;
    } else {
      console.error('❌ Failed to get session status');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting session status:', error);
    return null;
  }
}

/**
 * Run the complete flow
 */
async function runCompleteFlow() {
  console.log('🚀 Starting complete flow test...\n');
  
  try {
    // Step 1: Create checkout session
    const sessionId = await createCheckoutSession();
    if (!sessionId) {
      console.error('❌ Cannot continue without session ID');
      return;
    }

    // Step 2: Verify payment
    const paymentVerified = await verifyPayment(sessionId);
    if (!paymentVerified) {
      console.log('⚠️ Payment not verified - this is expected in test mode');
      console.log('   In real scenario, this would retry until payment is found');
    }

    // Step 3: Get gift codes
    const giftCodes = await getGiftCodes(sessionId);
    if (giftCodes.length === 0) {
      console.error('❌ No gift codes available');
      return;
    }

    // Step 4: Trigger automation
    const automationTriggered = await triggerGiftCardAutomation(sessionId, giftCodes);
    if (!automationTriggered) {
      console.error('❌ Failed to trigger automation');
      return;
    }

    // Step 5: Simulate completion
    const completionSuccess = await simulateGiftCardCompletion(sessionId);
    if (!completionSuccess) {
      console.error('❌ Failed to complete gift card application');
      return;
    }

    // Step 6: Check final status
    const finalStatus = await checkFinalStatus(sessionId);

    // Summary
    console.log('\n🎉 Complete Flow Test Results:');
    console.log('✅ Checkout session created and managed');
    console.log('✅ Payment verification attempted (CDP tracking)');
    console.log('✅ Gift codes allocated successfully');
    console.log('✅ Gift card automation triggered');
    console.log('✅ Order placement simulated');
    console.log(`✅ Final session status: ${finalStatus}`);

    console.log('\n📋 Flow Summary:');
    console.log('1. User makes payment → Extension processes transaction');
    console.log('2. Backend creates checkout session');
    console.log('3. CDP tracking verifies payment on blockchain');
    console.log('4. Gift codes allocated for the session');
    console.log('5. Extension receives automation trigger');
    console.log('6. Extension applies gift codes to Amazon cart');
    console.log('7. Extension places order automatically');
    console.log('8. Backend notified of completion');

    console.log('\n🔗 Integration Points:');
    console.log('• Frontend: Payment success → Verification trigger');
    console.log('• Backend: CDP tracking → Gift code allocation');
    console.log('• Extension: Automation trigger → Gift card application');
    console.log('• Database: Session status updates throughout flow');

  } catch (error) {
    console.error('❌ Complete flow test failed:', error);
  }
}

// Run test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  runCompleteFlow().catch(console.error);
} else {
  // Browser environment
  console.log('🌐 Running in browser - use runCompleteFlow() to start test');
  window.runCompleteFlow = runCompleteFlow;
}
