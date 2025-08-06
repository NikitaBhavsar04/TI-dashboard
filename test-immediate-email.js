// Test immediate email sending
require('dotenv').config();
const mongoose = require('mongoose');
const { agenda } = require('./lib/agenda');

// Mock email document for testing
const ScheduledEmailSchema = new mongoose.Schema({
  advisoryId: { type: String, required: true },
  to: [{ type: String, required: true }],
  subject: { type: String, required: true },
  customMessage: { type: String },
  scheduledDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  createdBy: { type: String, required: true },
  sentAt: { type: Date },
  errorMessage: { type: String }
});

const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);

async function testImmediateEmail() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Find any advisory for testing
    const Advisory = mongoose.model('Advisory');
    const advisory = await Advisory.findOne();
    
    if (!advisory) {
      console.log('❌ No advisory found for testing');
      return;
    }

    console.log(`📧 Testing immediate email with advisory: ${advisory.title}`);

    // Create test email document
    const emailDoc = await ScheduledEmail.create({
      advisoryId: advisory._id,
      to: ['test@example.com'],
      subject: 'Test Immediate Email',
      customMessage: 'This is a test immediate email',
      scheduledDate: new Date(), // Current time for immediate sending
      status: 'pending',
      createdBy: 'test-user'
    });

    console.log(`📝 Created email document: ${emailDoc._id}`);

    // Start agenda and send immediately
    await agenda.start();
    console.log('✅ Agenda started');

    console.log('🚀 Queuing immediate email job...');
    const job = await agenda.now('send-scheduled-advisory-email', { 
      emailId: emailDoc._id 
    });

    console.log('📋 Job queued:', job.attrs.name);
    console.log('⏰ Job next run:', job.attrs.nextRunAt);

    // Wait a bit and check status
    console.log('⏳ Waiting 5 seconds to check processing...');
    
    setTimeout(async () => {
      try {
        const updatedEmail = await ScheduledEmail.findById(emailDoc._id);
        console.log('📊 Email status after processing:', {
          status: updatedEmail.status,
          sentAt: updatedEmail.sentAt,
          errorMessage: updatedEmail.errorMessage
        });

        // Check agenda jobs
        const jobs = await agenda.jobs({ 'data.emailId': emailDoc._id });
        console.log(`📋 Found ${jobs.length} agenda jobs for this email`);
        
        jobs.forEach(job => {
          console.log('  Job:', {
            name: job.attrs.name,
            nextRunAt: job.attrs.nextRunAt,
            lastRunAt: job.attrs.lastRunAt,
            failCount: job.attrs.failCount,
            failReason: job.attrs.failReason
          });
        });

        process.exit(0);
      } catch (error) {
        console.error('❌ Error checking status:', error);
        process.exit(1);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testImmediateEmail();
