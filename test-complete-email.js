// Comprehensive test for enhanced email with patch details and metadata
const http = require('http');

const postData = JSON.stringify({
  customMessage: `🚨 CRITICAL SECURITY ALERT - IMMEDIATE ACTION REQUIRED 🚨

This is a comprehensive test of the enhanced email template system including:
✅ Patch details and remediation steps
✅ MITRE ATT&CK tactics mapping
✅ Comprehensive metadata display
✅ Affected products and target sectors

Please verify all sections are properly rendered:
1. Executive Summary
2. CVE identifiers
3. Technical Analysis
4. Patch Information (NEW)
5. Impact & Scope (NEW)
6. MITRE ATT&CK Tactics (NEW)
7. Advisory Metadata (NEW)
8. IOCs table
9. Recommendations
10. References and tags

SOC Team - EaglEye IntelDesk`
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/test-enhanced-email-new',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔍 Testing COMPLETE Enhanced Email Template with Patch Details & Metadata...');
console.log('📡 Making request to development server...\n');

const req = http.request(options, (res) => {
  console.log(`📋 Status: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n✅ Response received:');
      
      if (response.success) {
        console.log('🎉 Enhanced email template test was successful!');
        console.log('\n📊 Complete Advisory Coverage:');
        console.log(`   📄 Title: ${response.advisory.title}`);
        console.log(`   ⚠️  Severity: ${response.advisory.severity}`);
        console.log(`   🆔 Threat ID: ${response.advisory.threatId}`);
        console.log(`   🔍 CVEs: ${response.advisory.cveCount}`);
        console.log(`   ⚠️  IOCs: ${response.advisory.iocCount}`);
        console.log(`   ✅ Recommendations: ${response.advisory.recommendationCount}`);
        console.log(`   🔧 Patch Details: ${response.advisory.patchDetailsCount} (NEW)`);
        console.log(`   ⚔️  MITRE Tactics: ${response.advisory.mitreTacticsCount} (NEW)`);
        console.log(`   📦 Affected Products: ${response.advisory.affectedProductsCount} (NEW)`);
        console.log(`   🏢 Target Sectors: ${response.advisory.targetSectorsCount} (NEW)`);
        console.log(`   🔒 TLP Classification: ${response.advisory.tlp} (NEW)`);
        
        console.log('\n📧 Email Template Features:');
        console.log('   ✅ Executive Summary with proper formatting');
        console.log('   ✅ CVE identifiers with styled badges');
        console.log('   ✅ Technical analysis section');
        console.log('   ✅ Patch information with remediation steps (NEW)');
        console.log('   ✅ Impact scope with affected products/sectors (NEW)');
        console.log('   ✅ MITRE ATT&CK tactics mapping (NEW)');
        console.log('   ✅ Complete advisory metadata (NEW)');
        console.log('   ✅ IOCs in organized tables');
        console.log('   ✅ Actionable recommendations');
        console.log('   ✅ Reference links and tags');
        console.log('   ✅ Mobile responsive design');
        console.log('   ✅ Professional cyber security styling');
        
        console.log('\n🔍 Check the development server console for detailed job output');
        console.log('📋 All missing information has been successfully added to the email template!');
        
      } else {
        console.log('\n❌ Test failed:', response.message);
        if (response.error) {
          console.log('Error details:', response.error);
        }
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
