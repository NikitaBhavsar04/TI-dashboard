// Test Email Functionality
const { agenda } = require('./lib/agenda');

async function testEmailSending() {
  try {
    console.log('🔍 Testing email sending functionality...');
    
    // Check if agenda is running
    console.log('📋 Checking agenda status...');
    await agenda.start();
    console.log('✅ Agenda started successfully');
    
    // Test immediate email sending
    console.log('📧 Testing immediate email send...');
    const testJob = await agenda.now('send-scheduled-advisory-email', {
      emailId: 'test-id-' + Date.now()
    });
    console.log('✅ Immediate email job queued:', testJob.attrs.name);
    
    // Test scheduled email
    console.log('⏰ Testing scheduled email...');
    const futureDate = new Date(Date.now() + 60000); // 1 minute from now
    const scheduledJob = await agenda.schedule(futureDate, 'send-scheduled-advisory-email', {
      emailId: 'test-scheduled-' + Date.now()
    });
    console.log('✅ Scheduled email job created:', scheduledJob.attrs.name);
    
    // Check job processing
    console.log('🔄 Checking job processing...');
    const jobs = await agenda.jobs({});
    console.log(`📊 Total jobs in queue: ${jobs.length}`);
    
    jobs.forEach(job => {
      console.log(`  - Job: ${job.attrs.name}, Status: ${job.attrs.nextRunAt ? 'Scheduled' : 'Completed'}, Data:`, job.attrs.data);
    });
    
    setTimeout(() => {
      console.log('🔍 Test completed. Check the output above for any issues.');
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error testing email functionality:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testEmailSending();
}

module.exports = testEmailSending;
