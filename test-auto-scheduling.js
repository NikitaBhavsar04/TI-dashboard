// Create a scheduled email directly in database and wait for automatic processing
require('dotenv').config();

const mongoose = require('mongoose');

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

const testAutoScheduling = async () => {
  console.log('🧪 Testing automatic email scheduling...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');

    // Create a scheduled email for 1 minute from now
    const now = new Date();
    const scheduleTime = new Date(now.getTime() + 60000); // 1 minute from now
    
    console.log(`⏰ Current time: ${now.toLocaleTimeString()}`);
    console.log(`⏰ Scheduling for: ${scheduleTime.toLocaleTimeString()}`);

    const testEmail = new ScheduledEmail({
      advisoryId: '6883112b4610d828d41c557f', // Use the working advisory ID
      to: ['mayankrajput2110@gmail.com'],
      subject: 'AUTO-TEST: Apache Struts 2 Zero-Day Vulnerability',
      customMessage: '', // Leave empty to test auto-generated content
      scheduledDate: scheduleTime,
      createdBy: 'auto-test',
      status: 'pending'
    });

    await testEmail.save();
    console.log(`Email created with ID: ${testEmail._id}`);

    // Now call the API to create the Agenda job (simulate what the web interface does)
    console.log('📤 Creating Agenda job via API...');
    
    try {
      const response = await fetch('http://localhost:3000/api/start-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      console.log('Agenda status:', result);
    } catch (apiError) {
      console.log('API call failed:', apiError.message);
    }

    // Wait for the scheduled time + extra buffer
    const waitTime = scheduleTime.getTime() - Date.now() + 30000; // Wait extra 30 seconds
    console.log(`⏳ Waiting ${Math.round(waitTime/1000)} seconds for email to be processed automatically...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Check if email was sent
    const updatedEmail = await ScheduledEmail.findById(testEmail._id);
    console.log(`\n📊 Final status: ${updatedEmail.status}`);
    console.log(`📅 Sent at: ${updatedEmail.sentAt || 'Not sent'}`);
    
    if (updatedEmail.status === 'sent') {
      console.log('AUTO-SCHEDULING WORKS! Email was sent automatically with content!');
    } else if (updatedEmail.status === 'failed') {
      console.log('❌ Email failed to send automatically');
      console.log(`Error: ${updatedEmail.errorMessage}`);
    } else {
      console.log('⏳ Email is still pending - automatic processing may not be working');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
};

testAutoScheduling();
