// Test the improved email content
require('dotenv').config();

const mongoose = require('mongoose');
const { startAgenda } = require('./lib/agenda');

// Define schemas (same as in agenda.js)
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

const AdvisorySchema = new mongoose.Schema({
  title: String,
  description: String,
  severity: String,
  category: String,
  author: String,
  publishedDate: Date,
  affectedSystems: [String],
  recommendations: [String],
  iocs: [String]
});

const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
const Advisory = mongoose.models.Advisory || mongoose.model('Advisory', AdvisorySchema);

const testEmailContent = async () => {
  console.log('🧪 Testing improved email content...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Find any existing advisory to test with
    const advisory = await Advisory.findOne();
    if (!advisory) {
      console.log('❌ No advisories found in database');
      process.exit(1);
    }

    console.log(`📄 Found advisory: ${advisory.title}`);
    console.log(`📊 Severity: ${advisory.severity}`);
    console.log(`📁 Category: ${advisory.category}`);

    // Create a test scheduled email
    const now = new Date();
    const scheduleTime = new Date(now.getTime() + 30000); // 30 seconds from now

    const testEmail = new ScheduledEmail({
      advisoryId: advisory._id,
      to: ['mayankrajput2110@gmail.com'],
      subject: `TEST: ${advisory.title}`,
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
    
    console.log('⏰ Agenda job created');
    console.log(`⏳ Waiting 35 seconds for email to be sent...`);
    
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Check if email was sent
    const updatedEmail = await ScheduledEmail.findById(testEmail._id);
    console.log(`\n📊 Final status: ${updatedEmail.status}`);
    
    if (updatedEmail.status === 'sent') {
      console.log('✅ Test email sent successfully with proper content!');
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

testEmailContent();
