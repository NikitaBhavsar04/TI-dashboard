// Test scheduled emails API
async function testAPI() {
  try {
    console.log('🔍 Testing scheduled emails API...\n');
    
    const response = await fetch('http://localhost:3002/api/scheduled-emails', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODg2YjllZTMwYTIxZDljZDlhNGU5ZGYiLCJlbWFpbCI6Im1heWFua3JhanB1dDIxMTBAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzM2NjQwMzUzfQ.ORfwXWL7_FGZFrzjqMI7LX8BBR32VQTMOh5LRImlSBg'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    
    console.log(`Success! Found ${data.scheduledEmails?.length || 0} scheduled emails\n`);
    
    if (data.scheduledEmails && data.scheduledEmails.length > 0) {
      console.log('📧 First 5 emails:');
      data.scheduledEmails.slice(0, 5).forEach((email, index) => {
        console.log(`\n${index + 1}. ID: ${email._id}`);
        console.log(`   Advisory: ${email.advisoryId}`);
        console.log(`   Status: ${email.status}`);
        console.log(`   To: ${email.to?.join(', ')}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Scheduled: ${email.scheduledDate}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
