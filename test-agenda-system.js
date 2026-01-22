// Test script for Agenda.js email system
require('dotenv').config();

const { startAgenda } = require('./lib/agenda');
const Email = require('./lib/emailModel');

const testAgendaSystem = async () => {
  console.log('🧪 Testing Agenda Email System...');
  
  try {
    // Start Agenda
    console.log('\n🚀 Starting Agenda...');
    const agenda = await startAgenda();
    
    // Check for existing scheduled emails
    console.log('\n📋 Checking for scheduled emails...');
    const scheduledEmails = await Email.find({ status: 'scheduled' });
    console.log(`Found ${scheduledEmails.length} scheduled emails`);
    
    if (scheduledEmails.length > 0) {
      console.log('\n📧 Scheduled emails:');
      scheduledEmails.forEach((email, index) => {
        console.log(`${index + 1}. To: ${email.to}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Scheduled: ${email.scheduledAt}`);
        console.log(`   Status: ${email.status}`);
        console.log(`   Created: ${email.createdAt}`);
        console.log('');
      });
      
      // Create Agenda jobs for emails that should be processed now
      console.log('\n⚡ Creating Agenda jobs for overdue emails...');
      const now = new Date();
      
      for (const email of scheduledEmails) {
        if (new Date(email.scheduledAt) <= now) {
          await agenda.now('send-scheduled-email', { emailId: email._id.toString() });
          console.log(`Created immediate job for email to ${email.to}`);
        } else {
          await agenda.schedule(email.scheduledAt, 'send-scheduled-email', { emailId: email._id.toString() });
          console.log(`⏰ Scheduled job for email to ${email.to} at ${email.scheduledAt}`);
        }
      }
    }
    
    // Check Agenda jobs
    console.log('\n📊 Checking Agenda jobs...');
    const jobs = await agenda.jobs({});
    console.log(`Found ${jobs.length} Agenda jobs`);
    
    jobs.forEach((job, index) => {
      console.log(`${index + 1}. Name: ${job.attrs.name}`);
      console.log(`   Next run: ${job.attrs.nextRunAt}`);
      console.log(`   Last run: ${job.attrs.lastRunAt}`);
      console.log(`   Data: ${JSON.stringify(job.attrs.data)}`);
      console.log('');
    });
    
    console.log('\nTest completed. Agenda is now running and will process jobs automatically.');
    console.log('💡 Keep this script running to process emails, or integrate with your Next.js app.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

// Run the test
testAgendaSystem().catch(console.error);

// Keep the process alive to let Agenda work
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});
