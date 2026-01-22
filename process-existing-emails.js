// Process existing pending emails using the correct model
require('dotenv').config();

const { startAgenda } = require('./lib/agenda');
const mongoose = require('mongoose');

// Define the ScheduledEmail schema directly
const ScheduledEmailSchema = new mongoose.Schema({
  advisoryId: { type: String, required: true, ref: 'Advisory' },
  to: [{ type: String, required: true, trim: true }],
  cc: [{ type: String, trim: true }],
  bcc: [{ type: String, trim: true }],
  subject: { type: String, required: true, trim: true },
  customMessage: { type: String, trim: true },
  scheduledDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 }
});

const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);

const processPendingEmails = async () => {
  console.log('🔄 Processing pending scheduled emails from scheduledemails collection...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');

    // Find all pending emails that should have been sent
    const now = new Date();
    const pendingEmails = await ScheduledEmail.find({
      status: 'pending',
      scheduledDate: { $lte: now }
    });

    console.log(`📧 Found ${pendingEmails.length} emails that should be processed`);

    if (pendingEmails.length > 0) {
      // Show details of emails to be processed
      console.log('\nEmails to process:');
      pendingEmails.forEach((email, index) => {
        console.log(`${index + 1}. To: ${email.to.join(', ')}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Scheduled: ${email.scheduledDate}`);
        console.log(`   Current time: ${now}`);
        console.log(`   Overdue by: ${Math.round((now - new Date(email.scheduledDate)) / 1000 / 60)} minutes`);
        console.log('');
      });

      // Start Agenda
      const agenda = await startAgenda();
      console.log('⚡ Agenda started');

      // Process each email immediately
      for (const email of pendingEmails) {
        console.log(`📤 Processing email to ${email.to.join(', ')}: ${email.subject}`);
        
        try {
          // Schedule immediate job
          await agenda.now('send-scheduled-email', { emailId: email._id.toString() });
          console.log(`Queued email ${email._id} for immediate processing`);
        } catch (error) {
          console.error(`❌ Failed to queue email ${email._id}:`, error);
        }
      }

      console.log('⏳ Waiting 15 seconds for jobs to process...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Check status after processing
      console.log('\n📊 Final status check:');
      for (const email of pendingEmails) {
        const updated = await ScheduledEmail.findById(email._id);
        const statusIcon = updated.status === 'sent' ? '✅' : updated.status === 'failed' ? '❌' : '⏳';
        console.log(`${email.to.join(', ')}: ${updated.status} ${statusIcon}`);
        if (updated.errorMessage) {
          console.log(`   Error: ${updated.errorMessage}`);
        }
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
