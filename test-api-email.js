// Quick test for enhanced email functionality
const http = require('http');

const postData = JSON.stringify({
  customMessage: 'URGENT: This is a test of the enhanced email template system.\n\nPlease verify:\n1. All advisory fields are populated\n2. Email formatting is correct\n3. Mobile responsiveness works\n\nSOC Team'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/test-enhanced-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing Enhanced Email Template...');
console.log('📡 Making request to development server...\n');

const req = http.request(options, (res) => {
  console.log(`📋 Status: ${res.statusCode}`);
  console.log(`📨 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n✅ Response received:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n🎉 Enhanced email template test was successful!');
        console.log('📧 Check the agenda job output for detailed email generation results');
        console.log('📋 Advisory Summary:');
        console.log(`   - Title: ${response.advisory.title}`);
        console.log(`   - Severity: ${response.advisory.severity}`);
        console.log(`   - Threat ID: ${response.advisory.threatId}`);
        console.log(`   - CVEs: ${response.advisory.cveCount}`);
        console.log(`   - IOCs: ${response.advisory.iocCount}`);
        console.log(`   - Recommendations: ${response.advisory.recommendationCount}`);
      } else {
        console.log('\n❌ Test failed:', response.message);
      }
    } catch (error) {
      console.log('\n❌ Error parsing response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Make sure the development server is running on port 3000');
  console.log('   You can start it with: npm run dev');
});

// Send the request
req.write(postData);
req.end();
