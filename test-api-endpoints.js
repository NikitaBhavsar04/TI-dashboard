// Quick API Test
// File: test-api-endpoints.js

const http = require('http');
const fs = require('fs');

async function testEndpoints() {
  console.log('🧪 Testing Email Tracking API Endpoints...\n');

  const baseUrl = 'http://localhost:3000';
  
  // Test 1: Analytics endpoint
  console.log('1️⃣ Testing Analytics API...');
  try {
    const analyticsUrl = `${baseUrl}/api/tracking/analytics?dateRange=7d`;
    const response = await fetch(analyticsUrl);
    const data = await response.json();
    console.log(`   ✅ Analytics API: ${response.status}`);
    console.log(`   📊 Found ${data.statistics?.totalEmails || 0} emails in tracking`);
  } catch (error) {
    console.log(`   ❌ Analytics API failed: ${error.message}`);
  }

  // Test 2: Pixel endpoint
  console.log('\n2️⃣ Testing Tracking Pixel...');
  try {
    const pixelUrl = `${baseUrl}/api/track/pixel?t=test_pixel_tracking&r=12345`;
    const response = await fetch(pixelUrl);
    console.log(`   ✅ Pixel endpoint: ${response.status}`);
    console.log(`   📏 Content-Length: ${response.headers.get('content-length')}`);
    console.log(`   🖼️  Content-Type: ${response.headers.get('content-type')}`);
  } catch (error) {
    console.log(`   ❌ Pixel endpoint failed: ${error.message}`);
  }

  // Test 3: Link tracking endpoint
  console.log('\n3️⃣ Testing Link Tracking...');
  try {
    const linkUrl = `${baseUrl}/api/track/link?t=test_link_tracking&u=https%3A%2F%2Fexample.com&l=test_link`;
    const response = await fetch(linkUrl, { redirect: 'manual' });
    console.log(`   ✅ Link tracking: ${response.status}`);
    console.log(`   📍 Redirect to: ${response.headers.get('location')}`);
  } catch (error) {
    console.log(`   ❌ Link tracking failed: ${error.message}`);
  }

  console.log('\n✅ API endpoint tests completed!');
}

if (require.main === module) {
  testEndpoints().catch(console.error);
}

module.exports = { testEndpoints };
