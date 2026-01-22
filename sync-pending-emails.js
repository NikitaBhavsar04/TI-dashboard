// Auto-sync pending emails with Agenda jobs
require('dotenv').config();

const { startAgenda } = require('./lib/agenda');
const mongoose = require('mongoose');

// Define the ScheduledEmail schema
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

const syncPendingEmails = async () => {
  console.log('🔄 Syncing pending emails with Agenda jobs...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');

    // Start Agenda
    const agenda = await startAgenda();
    console.log('Agenda started');

    // Find all pending emails
    const pendingEmails = await ScheduledEmail.find({ status: 'pending' });
    console.log(`📧 Found ${pendingEmails.length} pending emails`);

    const now = new Date();
    let processedCount = 0;
    let overdueCount = 0;

    for (const email of pendingEmails) {
      const scheduledDate = new Date(email.scheduledDate);
      
      console.log(`📅 Processing email to ${email.to.join(', ')}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Scheduled: ${scheduledDate}`);
      
      try {
        if (scheduledDate <= now) {
          // Email is overdue, process immediately
          await agenda.now('send-scheduled-email', { emailId: email._id.toString() });
          console.log(`   ⚡ Queued for immediate processing (overdue by ${Math.round((now - scheduledDate) / 1000 / 60)} minutes)`);
          overdueCount++;
        } else {
          // Email is in the future, schedule normally
          await agenda.schedule(scheduledDate, 'send-scheduled-email', { emailId: email._id.toString() });
          console.log(`   ⏰ Scheduled for future processing (in ${Math.round((scheduledDate - now) / 1000 / 60)} minutes)`);
        }
        processedCount++;
      } catch (jobError) {
        console.error(`   ❌ Failed to create job: ${jobError.message}`);
      }
      
      console.log('');
    }

    console.log(`Sync complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total emails: ${pendingEmails.length}`);
    console.log(`   - Jobs created: ${processedCount}`);
    console.log(`   - Overdue processed: ${overdueCount}`);
    console.log(`   - Future scheduled: ${processedCount - overdueCount}`);

    if (overdueCount > 0) {
      console.log('\n⏳ Waiting 10 seconds for overdue emails to process...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log('📊 Final status check:');
      for (const email of pendingEmails) {
        if (new Date(email.scheduledDate) <= now) {
          const updated = await ScheduledEmail.findById(email._id);
          const statusIcon = updated.status === 'sent' ? '✅' : updated.status === 'failed' ? '❌' : '⏳';
          console.log(`   ${email.to.join(', ')}: ${updated.status} ${statusIcon}`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
};

syncPendingEmails();
