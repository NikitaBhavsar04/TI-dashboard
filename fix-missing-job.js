// Fix missing Agenda job for pending email
require('dotenv').config();

const mongoose = require('mongoose');

const fixMissingAgendaJob = async () => {
  console.log('🔧 Fixing missing Agenda job for pending email...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');

    // Get the pending email
    const ScheduledEmailSchema = new mongoose.Schema({
      advisoryId: String,
      to: [String],
      subject: String,
      scheduledDate: Date,
      status: String,
      createdAt: Date,
      sentAt: Date
    });
    
    const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
    
    const pendingEmail = await ScheduledEmail.findById('688c56474e3f28c5d57b7599');
    
    if (!pendingEmail) {
      console.log('❌ Email not found');
      process.exit(1);
    }
    
    console.log(`📧 Found email: ${pendingEmail.subject}`);
    console.log(`📅 Scheduled for: ${pendingEmail.scheduledDate.toLocaleString()}`);
    
    // Create Agenda job via API
    console.log('📤 Creating Agenda job via API...');
    
    const response = await fetch('http://localhost:3000/api/start-agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    console.log('Agenda status:', result);

    // Since the scheduled time has passed, we need to process it immediately
    console.log('⚡ Processing email immediately since scheduled time has passed...');
    
    // Call the manual processing endpoint
    const processResponse = await fetch('http://localhost:3000/api/scheduled-emails/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailId: pendingEmail._id.toString() })
    });
    
    if (processResponse.ok) {
      const processResult = await processResponse.json();
      console.log('Processing result:', processResult);
    } else {
      console.log('❌ Processing failed:', await processResponse.text());
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

fixMissingAgendaJob();
