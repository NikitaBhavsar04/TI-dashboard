// Manual script to process pending scheduled emails
require('dotenv').config();

const { startAgenda } = require('./lib/agenda');
const Email = require('./lib/emailModel');
const mongoose = require('mongoose');

const processPendingEmails = async () => {
  console.log('🔄 Processing pending scheduled emails...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Find all pending emails that should have been sent
    const now = new Date();
    const pendingEmails = await Email.find({
      status: 'scheduled',
      scheduledAt: { $lte: now }
    });

    console.log(`📧 Found ${pendingEmails.length} emails that should be processed`);

    if (pendingEmails.length > 0) {
      // Start Agenda
      const agenda = await startAgenda();
      console.log('⚡ Agenda started');

      // Process each email immediately
      for (const email of pendingEmails) {
        console.log(`📤 Processing email to ${email.to}: ${email.subject}`);
        
        try {
          // Schedule immediate job
          await agenda.now('send-scheduled-email', { emailId: email._id.toString() });
          console.log(`✅ Queued email ${email._id} for immediate processing`);
        } catch (error) {
          console.error(`❌ Failed to queue email ${email._id}:`, error);
        }
      }

      console.log('⏳ Waiting 10 seconds for jobs to process...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check status after processing
      console.log('\n📊 Final status check:');
      for (const email of pendingEmails) {
        const updated = await Email.findById(email._id);
        console.log(`${email.to}: ${updated.status} ${updated.status === 'sent' ? '✅' : '⏳'}`);
      }

      console.log('\n🎉 Processing complete!');
    } else {
      console.log('ℹ️  No pending emails to process');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error processing emails:', error);
    process.exit(1);
  }
};

processPendingEmails();
