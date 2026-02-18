// Cleanup script for old pending scheduled emails
require('dotenv').config();
const mongoose = require('mongoose');

const ScheduledEmailSchema = new mongoose.Schema({
  advisoryId: String,
  to: [String],
  cc: [String],
  bcc: [String],
  from: String,
  sentByName: String,
  subject: String,
  customMessage: String,
  scheduledDate: Date,
  status: String,
  createdBy: String,
  createdAt: Date,
  sentAt: Date,
  errorMessage: String,
  trackingId: String
}, { strict: false });

const ScheduledEmail = mongoose.model('ScheduledEmail', ScheduledEmailSchema);

async function cleanupOldEmails() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));

    // Find all pending emails that are more than 1 hour overdue
    const overdueEmails = await ScheduledEmail.find({
      status: 'pending',
      scheduledDate: { $lt: oneHourAgo }
    });

    console.log(`📊 Found ${overdueEmails.length} overdue pending emails`);

    if (overdueEmails.length === 0) {
      console.log('✅ No overdue emails to clean up');
      process.exit(0);
    }

    // Cancel all overdue emails
    const result = await ScheduledEmail.updateMany(
      {
        status: 'pending',
        scheduledDate: { $lt: oneHourAgo }
      },
      {
        $set: { 
          status: 'cancelled',
          errorMessage: 'Email was more than 1 hour overdue. Automatically cancelled.',
          sentAt: now
        }
      }
    );

    console.log('✅ Cleanup completed!');
    console.log(`   - Updated: ${result.modifiedCount} emails`);
    console.log(`   - Status: pending → cancelled`);

    // Show some examples
    if (overdueEmails.length > 0) {
      console.log('\n📋 Sample cancelled emails:');
      overdueEmails.slice(0, 5).forEach(email => {
        const delayHours = Math.round((now - new Date(email.scheduledDate)) / (1000 * 60 * 60));
        console.log(`   - ${email._id}: scheduled ${delayHours}h ago for ${email.to.join(', ')}`);
      });
    }

    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupOldEmails();
