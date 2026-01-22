// Test the corrected email template
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

const testCorrectedEmail = async () => {
  console.log('🧪 Testing corrected email template...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');

    // Use the same advisory ID we found earlier
    const advisoryId = '6883112b4610d828d41c557f';
    
    // Create a test scheduled email
    const now = new Date();
    const scheduleTime = new Date(now.getTime() + 30000); // 30 seconds from now

    const testEmail = new ScheduledEmail({
      advisoryId: advisoryId,
      to: ['mayankrajput2110@gmail.com'],
      subject: `TEST CORRECTED: Zero-Day Vulnerability in Apache Struts 2`,
      customMessage: '', // Leave empty to test auto-generated content
      scheduledDate: scheduleTime,
      createdBy: 'test-user',
      status: 'pending'
    });

    await testEmail.save();
    console.log(`📧 Created test email scheduled for: ${scheduleTime}`);

    // Start Agenda and create job
    const agenda = await startAgenda();
    await agenda.schedule(scheduleTime, 'send-scheduled-email', { emailId: testEmail._id.toString() });
    
    console.log('⏰ Agenda job created with corrected template');
    console.log(`⏳ Waiting 35 seconds for email to be sent...`);
    
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Check if email was sent
    const updatedEmail = await ScheduledEmail.findById(testEmail._id);
    console.log(`\n📊 Final status: ${updatedEmail.status}`);
    
    if (updatedEmail.status === 'sent') {
      console.log('Test email sent successfully with corrected rich content!');
      console.log('📧 Check your inbox for the properly formatted advisory email');
    } else {
      console.log('❌ Test email failed to send');
      if (updatedEmail.errorMessage) {
        console.log(`Error: ${updatedEmail.errorMessage}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

testCorrectedEmail();
