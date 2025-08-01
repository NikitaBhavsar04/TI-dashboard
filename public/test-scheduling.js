// Simple test to schedule an email using the API
const scheduleTestEmail = async () => {
  try {
    console.log('🧪 Testing email scheduling...');
    
    const response = await fetch('/api/schedule-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test Scheduled Email',
        body: 'This is a test email scheduled via the new Agenda system.',
        scheduledAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
      })
    });
    
    const result = await response.json();
    console.log('✅ Schedule result:', result);
    
    if (result.success) {
      console.log('🎉 Email scheduled successfully!');
      console.log(`📧 Email ID: ${result.emailId}`);
      console.log(`⏰ Scheduled for: ${result.scheduledAt}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run test when DOM is loaded
if (typeof window !== 'undefined') {
  window.scheduleTestEmail = scheduleTestEmail;
  console.log('📧 Test function loaded. Run scheduleTestEmail() in console to test.');
}
