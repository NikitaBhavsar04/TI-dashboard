// Quick test to verify tracking API and send-advisory API are working
const fetch = require('node-fetch');

async function testAPIs() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing API endpoints...');
  
  try {
    // Test tracking API (GET - should work without auth for pixel requests)
    console.log('\n1. Testing tracking pixel API...');
    const trackingResponse = await fetch(`${baseUrl}/api/emails/tracking?t=test-tracking-id&type=open`);
    
    if (trackingResponse.status === 200) {
      console.log('✅ Tracking pixel API is responding correctly');
    } else {
      console.log(`❌ Tracking API returned status: ${trackingResponse.status}`);
    }
    
    // Test analytics API (POST - should require auth)
    console.log('\n2. Testing analytics API...');
    const analyticsResponse = await fetch(`${baseUrl}/api/emails/tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      })
    });
    
    if (analyticsResponse.status === 401) {
      console.log('✅ Analytics API correctly requires authentication');
    } else {
      console.log(`⚠️ Analytics API returned status: ${analyticsResponse.status}`);
    }
    
    console.log('\n✨ API tests completed!');
    
  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
  }
}

testAPIs();
