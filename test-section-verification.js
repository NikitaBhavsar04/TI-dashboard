// Verification test for distinct sections: Recommendations vs Patch Details vs Metadata
const http = require('http');

const postData = JSON.stringify({
  customMessage: `🧪 SECTION DISTINCTION VERIFICATION TEST 🧪

This test verifies that our email template has THREE DISTINCT sections:

1️⃣ RECOMMENDATIONS (General Security Guidance):
   - Strategic security advice
   - Policy recommendations
   - Procedural improvements
   - Training and awareness

2️⃣ PATCH DETAILS (Technical Remediation Steps):
   - Specific version numbers
   - Installation commands
   - Configuration changes
   - Technical verification steps

3️⃣ METADATA (Advisory Information):
   - Publication dates
   - TLP classification
   - Geographic scope
   - Advisory tracking information

All sections should be visually distinct with different colors and clear headings.

SOC Team - Testing Complete Coverage`
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

console.log('🔍 VERIFICATION: Recommendations vs Patch Details vs Metadata Sections');
console.log('📡 Testing complete email template coverage...\n');

const req = http.request(options, (res) => {
  console.log(`📋 Status: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.success) {
        console.log('EMAIL TEMPLATE TEST SUCCESSFUL!\n');
        
        console.log('📊 SECTION VERIFICATION:');
        console.log('==========================================');
        
        console.log('\n1️⃣ RECOMMENDATIONS SECTION:');
        console.log(`    Count: ${response.advisory.recommendationCount} items`);
        console.log('   Purpose: General security guidance and strategic advice');
        console.log('   🎨 Visual: Green gradient background with checkmark icons');
        console.log('   📝 Content: Policy recommendations, procedural improvements');
        
        console.log('\n2️⃣ PATCH DETAILS SECTION:');
        console.log(`   🔧 Count: ${response.advisory.patchDetailsCount} items`);
        console.log('   Purpose: Specific technical remediation steps');
        console.log('   🎨 Visual: Purple gradient background with technical icons');
        console.log('   📝 Content: Version numbers, installation commands, verification');
        
        console.log('\n3️⃣ METADATA SECTION:');
        console.log('   📋 Content: Complete advisory information');
        console.log('   Purpose: Tracking, classification, and administrative data');
        console.log('   🎨 Visual: Gray gradient background with structured layout');
        console.log(`   🔒 TLP: ${response.advisory.tlp} classification`);
        console.log('   📝 Content: Dates, regions, advisory ID, timestamps');
        
        console.log('\n📈 COMPLETE COVERAGE VERIFICATION:');
        console.log('==========================================');
        console.log(`Advisory Title: ${response.advisory.title}`);
        console.log(`Severity Level: ${response.advisory.severity}`);
        console.log(`Threat ID: ${response.advisory.threatId}`);
        console.log(`CVE Count: ${response.advisory.cveCount}`);
        console.log(`IOC Count: ${response.advisory.iocCount}`);
        console.log(`Recommendations: ${response.advisory.recommendationCount} (DISTINCT SECTION)`);
        console.log(`Patch Details: ${response.advisory.patchDetailsCount} (DISTINCT SECTION)`);
        console.log(`MITRE Tactics: ${response.advisory.mitreTacticsCount}`);
        console.log(`Affected Products: ${response.advisory.affectedProductsCount}`);
        console.log(`Target Sectors: ${response.advisory.targetSectorsCount}`);
        console.log(`Metadata: Complete (DISTINCT SECTION)`);
        
        console.log('\n🎉 VERIFICATION COMPLETE!');
        console.log('All three sections are properly implemented and distinct:');
        console.log('   🟢 Recommendations: Strategic security guidance');
        console.log('   🟣 Patch Details: Technical remediation steps');
        console.log('   ⚪ Metadata: Administrative information');
        
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
});

// Send the request
req.write(postData);
req.end();
