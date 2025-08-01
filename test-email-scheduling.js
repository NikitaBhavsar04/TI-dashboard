// Test script to schedule and process emails
// Run this manually to test the email scheduling system

const testEmailScheduling = async () => {
  console.log('🧪 Testing Email Scheduling System...');
  
  try {
    // First, check status
    console.log('\n📊 Checking current status...');
    const statusResponse = await fetch('/api/scheduled-emails/status');
    const status = await statusResponse.json();
    console.log('Status:', status);
    
    // Process any due emails
    console.log('\n🔄 Processing due emails...');
    const processResponse = await fetch('/api/scheduled-emails/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const processResult = await processResponse.json();
    console.log('Process result:', processResult);
    
    // Check status again
    console.log('\n📊 Checking status after processing...');
    const finalStatusResponse = await fetch('/api/scheduled-emails/status');
    const finalStatus = await finalStatusResponse.json();
    console.log('Final status:', finalStatus);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Call the test function
testEmailScheduling();
