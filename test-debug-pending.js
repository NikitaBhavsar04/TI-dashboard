// Test current pending emails with debugging
require('dotenv').config();

const mongoose = require('mongoose');
const { startAgenda } = require('./lib/agenda');

// Define schemas
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

const testCurrentPending = async () => {
  console.log('🔄 Testing current pending emails with debugging...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');

    // Find pending emails
    const pendingEmails = await ScheduledEmail.find({ status: 'pending' });
    console.log(`📧 Found ${pendingEmails.length} pending emails`);

    if (pendingEmails.length > 0) {
      // Start Agenda
      const agenda = await startAgenda();
      console.log('Agenda started with debugging');

      // Process each email immediately to see the logs
      for (const email of pendingEmails) {
        console.log(`\n📤 Processing email:`);
        console.log(`   To: ${email.to.join(', ')}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Advisory ID: ${email.advisoryId}`);
        console.log(`   Custom Message: ${email.customMessage || 'None'}`);
        
        try {
          await agenda.now('send-scheduled-email', { emailId: email._id.toString() });
          console.log(`Queued email for immediate processing`);
        } catch (error) {
          console.error(`❌ Failed to queue email:`, error);
        }
      }

      console.log('\n⏳ Waiting 15 seconds for processing...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Check final status
      console.log('\n📊 Final status:');
      for (const email of pendingEmails) {
        const updated = await ScheduledEmail.findById(email._id);
        const statusIcon = updated.status === 'sent' ? '✅' : updated.status === 'failed' ? '❌' : '⏳';
        console.log(`   ${email.to.join(', ')}: ${updated.status} ${statusIcon}`);
        if (updated.errorMessage) {
          console.log(`   Error: ${updated.errorMessage}`);
        }
      }
    } else {
      console.log('ℹ️  No pending emails to test');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

testCurrentPending();
