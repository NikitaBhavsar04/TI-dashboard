// Simple test to debug the analytics API endpoint
const testAnalyticsEndpoint = async () => {
  console.log('🔍 Testing Analytics API Endpoint...\n');
  
  try {
    // First, let's test without auth to see what error we get
    console.log('1. Testing without authentication...');
    const response1 = await fetch('http://localhost:3000/api/analytics/data');
    const data1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response: ${JSON.stringify(data1)}`);
    
    if (response1.status === 401) {
      console.log('   ✅ Endpoint exists but requires authentication (expected)\n');
    } else {
      console.log('   ❌ Unexpected response\n');
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Check if the endpoint file exists by looking at 404 vs 401
  console.log('📁 Endpoint accessibility test complete');
};

// For Node.js environment, we need to import fetch
const fetch = require('node-fetch');
testAnalyticsEndpoint();
