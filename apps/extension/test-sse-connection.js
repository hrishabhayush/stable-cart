// Test SSE Connection from Extension Context
// Run this in the browser console to test SSE connectivity

console.log('🧪 Testing SSE Connection...');

// Test 1: Basic EventSource connection
function testBasicSSE() {
  console.log('📡 Testing basic EventSource connection...');
  
  try {
    const eventSource = new EventSource('http://localhost:65535/api/checkout-sessions/session-198b3b3c0414f7wag3b/events');
    
    eventSource.onopen = function(event) {
      console.log('✅ SSE connection opened successfully');
    };
    
    eventSource.onmessage = function(event) {
      console.log('📨 SSE message received:', event.data);
    };
    
    eventSource.addEventListener('connected', function(event) {
      const data = JSON.parse(event.data);
      console.log('🔗 Connected event received:', data);
    });
    
    eventSource.onerror = function(event) {
      console.error('❌ SSE connection error:', event);
    };
    
    // Store reference for cleanup
    window.testEventSource = eventSource;
    
    console.log('✅ Basic SSE test completed');
    
  } catch (error) {
    console.error('❌ SSE test failed:', error);
  }
}

// Test 2: Test with our SSEService class
async function testSSEService() {
  console.log('🔧 Testing SSEService class...');
  
  try {
    // Import the SSEService (this would work in the extension context)
    const { SSEService } = await import('./src/services/SSEService.js');
    
    const sseService = new SSEService();
    
    sseService.connect('session-198b3b3c0414f7wag3b', 
      () => console.log('✅ SSE Service: Connected'),
      (event, data) => console.log('📨 SSE Service: Message received:', event, data),
      (error) => console.error('❌ SSE Service: Error:', error)
    );
    
    console.log('✅ SSEService test completed');
    
  } catch (error) {
    console.log('ℹ️ SSEService test skipped (not available in this context):', error.message);
  }
}

// Test 3: Test React hook (simulated)
function testReactHook() {
  console.log('⚛️ Testing React hook simulation...');
  
  // Simulate the hook behavior
  let connectionState = { isConnected: false, sessionId: undefined };
  let lastEvent = undefined;
  
  function connect(sessionId) {
    console.log('🔌 Hook: Connecting to session:', sessionId);
    connectionState.sessionId = sessionId;
    
    // Simulate connection
    setTimeout(() => {
      connectionState.isConnected = true;
      console.log('✅ Hook: Connection established');
      
      // Simulate receiving an event
      setTimeout(() => {
        lastEvent = {
          event: 'status_update',
          data: { status: 'PAID', message: 'Payment confirmed' },
          timestamp: new Date().toISOString()
        };
        console.log('📨 Hook: Event received:', lastEvent);
      }, 1000);
      
    }, 500);
  }
  
  connect('session-198b3b3c0414f7wag3b');
  console.log('✅ React hook test completed');
}

// Run all tests
console.log('🚀 Starting SSE Integration Tests...\n');

testBasicSSE();
setTimeout(testSSEService, 1000);
setTimeout(testReactHook, 2000);

console.log('\n📋 Test Summary:');
console.log('1. Basic EventSource connection');
console.log('2. SSEService class integration');
console.log('3. React hook simulation');
console.log('\n💡 Check the console for results!');
console.log('🧹 Run cleanup() to close connections');

// Cleanup function
window.cleanup = function() {
  if (window.testEventSource) {
    window.testEventSource.close();
    console.log('🧹 Test connections cleaned up');
  }
};
