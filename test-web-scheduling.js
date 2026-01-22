// Test scheduling through the proper API endpoint
require('dotenv').config();

const testScheduling = async () => {
  console.log('🧪 Testing email scheduling through API...');
  
  const now = new Date();
  const scheduleTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
  
  console.log(`⏰ Scheduling email for: ${scheduleTime}`);
  console.log(`⏰ Current time: ${now}`);
  
  try {
    // Simulate the web interface call to schedule an email
    const response = await fetch('http://localhost:3000/api/scheduled-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You might need a real token
      },
      body: JSON.stringify({
        advisoryId: '6883112b4610d828d41c557f', // Use the working advisory ID
        to: ['mayankrajput2110@gmail.com'],
        subject: 'TEST SCHEDULED: Apache Struts 2 Zero-Day',
        customMessage: '', // Leave empty to test auto-generated content
        scheduledDate: scheduleTime.toISOString()
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Email scheduled successfully:', result);
      
      console.log('\n⏳ Waiting for scheduled time...');
      const waitTime = scheduleTime.getTime() - Date.now() + 10000; // Wait extra 10 seconds
      
      setTimeout(async () => {
        console.log('\n📊 Checking if email was sent...');
        // You can add code here to check the database for the email status
        console.log('Check your email inbox!');
      }, waitTime);
      
    } else {
      console.log('❌ Failed to schedule email:', response.status, response.statusText);
      const error = await response.text();
      console.log('Error details:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testScheduling();
