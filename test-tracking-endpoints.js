// Test the tracking endpoints
const testTrackingEndpoints = async () => {
  console.log('🔍 Testing Email Tracking Endpoints...\n');

  // Test 1: Tracking pixel endpoint
  console.log('1. Testing tracking pixel endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/tracking/pixel?trackingId=track-001-1755509439111');
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log('   Pixel endpoint working\n');
  } catch (error) {
    console.log(`   ❌ Pixel endpoint error: ${error.message}\n`);
  }

  // Test 2: Click tracking endpoint  
  console.log('2. Testing click tracking endpoint...');
  try {
    const testUrl = 'https://example.com';
    const response = await fetch(`http://localhost:3000/api/tracking/click?trackingId=track-001-1755509439111&url=${encodeURIComponent(testUrl)}`, {
      redirect: 'manual'
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Location header: ${response.headers.get('location')}`);
    console.log('   Click tracking working\n');
  } catch (error) {
    console.log(`   ❌ Click tracking error: ${error.message}\n`);
  }

  // Test 3: Analytics data endpoint
  console.log('3. Testing analytics data endpoint...');
  try {
    const response = await fetch('http://localhost:3000/api/analytics/data');
    console.log(`   Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      console.log('   Analytics data endpoint working\n');
    }
  } catch (error) {
    console.log(`   ❌ Analytics data error: ${error.message}\n`);
  }

  console.log('All tracking endpoints tested!');
};

testTrackingEndpoints();
