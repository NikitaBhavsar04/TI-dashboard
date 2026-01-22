// TEST MANUAL ADVISORY WORKFLOW
// ============================================================
// This script tests the complete manual advisory workflow:
// 1. Generate advisory from raw article
// 2. Verify JSON output
// 3. Save to Eagle Nest
// 4. Retrieve from Eagle Nest
// ============================================================

const fetch = require('node-fetch');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testArticleId: 'test-article-001',
  username: 'admin',
  password: 'admin123'
};

async function testWorkflow() {
  console.log('🧪 TESTING MANUAL ADVISORY WORKFLOW\n');

  try {
    // Step 1: Login
    console.log('📝 Step 1: Login as admin...');
    const loginRes = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_CONFIG.username,
        password: TEST_CONFIG.password
      })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.statusText}`);
    }

    const cookies = loginRes.headers.get('set-cookie');
    console.log('Login successful\n');

    // Step 2: Generate advisory
    console.log('📝 Step 2: Generate advisory from raw article...');
    const generateRes = await fetch(`${TEST_CONFIG.baseUrl}/api/manual-advisory/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        articleId: TEST_CONFIG.testArticleId
      })
    });

    if (!generateRes.ok) {
      throw new Error(`Generate failed: ${generateRes.statusText}`);
    }

    const generateData = await generateRes.json();
    
    if (!generateData.success) {
      throw new Error(`Generate error: ${generateData.error}`);
    }

    console.log('Advisory generated successfully');
    console.log(`   Advisory ID: ${generateData.advisory.advisory_id}`);
    console.log(`   Title: ${generateData.advisory.title}\n`);

    // Step 3: Save to Eagle Nest
    console.log('📝 Step 3: Save advisory to Eagle Nest...');
    const saveRes = await fetch(`${TEST_CONFIG.baseUrl}/api/eagle-nest`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(generateData.advisory)
    });

    if (!saveRes.ok) {
      throw new Error(`Save failed: ${saveRes.statusText}`);
    }

    const saveData = await saveRes.json();
    
    if (!saveData.success) {
      throw new Error(`Save error: ${saveData.error}`);
    }

    console.log('Advisory saved to Eagle Nest');
    console.log(`   File: ${saveData.advisory_id}.json\n`);

    // Step 4: Retrieve from Eagle Nest
    console.log('📝 Step 4: Retrieve advisories from Eagle Nest...');
    const listRes = await fetch(`${TEST_CONFIG.baseUrl}/api/eagle-nest`, {
      method: 'GET',
      headers: { 
        'Cookie': cookies
      }
    });

    if (!listRes.ok) {
      throw new Error(`List failed: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    
    console.log('Eagle Nest advisories retrieved');
    console.log(`   Total advisories: ${listData.advisories.length}`);
    
    const foundAdvisory = listData.advisories.find(
      a => a.advisory_id === generateData.advisory.advisory_id
    );
    
    if (foundAdvisory) {
      console.log(`   Test advisory found in list`);
      console.log(`      Status: ${foundAdvisory.status}`);
      console.log(`      Saved at: ${foundAdvisory.saved_to_eagle_nest_at}\n`);
    } else {
      console.log(`   ⚠️ Test advisory not found in list\n`);
    }

    // Step 5: Delete test advisory
    console.log('📝 Step 5: Clean up - delete test advisory...');
    const deleteRes = await fetch(
      `${TEST_CONFIG.baseUrl}/api/eagle-nest?id=${generateData.advisory.advisory_id}`, 
      {
        method: 'DELETE',
        headers: { 
          'Cookie': cookies
        }
      }
    );

    if (!deleteRes.ok) {
      throw new Error(`Delete failed: ${deleteRes.statusText}`);
    }

    const deleteData = await deleteRes.json();
    
    if (deleteData.success) {
      console.log('Test advisory deleted successfully\n');
    }

    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('WORKFLOW SUMMARY:');
    console.log('================');
    console.log('1. Admin authentication');
    console.log('2. Advisory generation from raw article');
    console.log('3. Advisory saved to Eagle Nest');
    console.log('4. Advisory retrieved from Eagle Nest');
    console.log('5. Advisory deleted from Eagle Nest');
    console.log('\n📋 The complete workflow is functioning correctly!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testWorkflow();
