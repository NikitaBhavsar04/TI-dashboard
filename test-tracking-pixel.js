// Test Email Tracking Pixel Response
// This script tests if the tracking pixel endpoints are working correctly

const fetch = require('node-fetch').default || require('node-fetch');

async function testTrackingPixel() {
  console.log('🧪 Testing Email Tracking Pixel\n');

  const baseUrl = 'http://localhost:3000';
  
  // Sample tracking ID from database
  const testTrackingId = '1598bd97-f884-4e84-9dba-5a974f3c9371';
  
  const tests = [
    {
      name: 'Main tracking endpoint',
      url: `${baseUrl}/api/emails/tracking?t=${testTrackingId}&type=open`,
      expectImage: true
    },
    {
      name: 'Alternative pixel endpoint',
      url: `${baseUrl}/api/track/pixel?t=${testTrackingId}`,
      expectImage: true
    },
    {
      name: 'Tracking events API',
      url: `${baseUrl}/api/tracking/events?timeRange=24h`,
      expectJSON: true
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url);
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);
      
      if (test.expectImage) {
        if (contentType && contentType.includes('image')) {
          console.log(`   Successfully returned image`);
          const buffer = await response.buffer();
          console.log(`   📏 Image size: ${buffer.length} bytes`);
        } else {
          console.log(`   ❌ Expected image but got: ${contentType}`);
          const text = await response.text();
          console.log(`   Response: ${text.substring(0, 100)}...`);
        }
      } else if (test.expectJSON) {
        if (response.ok) {
          const data = await response.json();
          console.log(`   JSON response received`);
          console.log(`   Events: ${data.events?.length || 0}`);
          console.log(`   Summary: ${JSON.stringify(data.summary || {})}`);
        } else {
          console.log(`   ❌ Failed to get JSON response`);
          const text = await response.text();
          console.log(`   Error: ${text}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n💡 Analysis:');
  console.log('   If the tracking pixel endpoints return images (PNG), tracking should work.');
  console.log('   If you see "Successfully returned image", the pixel tracking is functional.');
  console.log('   The issue might be that emails need to actually load the pixel to register opens.');
  console.log('\n Next steps:');
  console.log('   1. Open an actual email that was sent');
  console.log('   2. Check if the email HTML includes the tracking pixel');
  console.log('   3. Verify the pixel URL in the email is correct');
  console.log('   4. Check if email clients are blocking the pixel');
}

testTrackingPixel().catch(console.error);
