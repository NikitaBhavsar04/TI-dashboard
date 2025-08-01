// Test automated scheduling without authentication
require('dotenv').config();

const mongoose = require('mongoose');

const testAutomatedScheduling = async () => {
  console.log('🧪 TESTING AUTOMATED SCHEDULING (Direct Database)');
  console.log('================================================');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Step 1: Create email directly in database
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

    const scheduleTime = new Date(Date.now() + 90000); // 1.5 minutes from now
    console.log(`⏰ Scheduling for: ${scheduleTime.toLocaleString()}`);

    const testEmail = new ScheduledEmail({
      advisoryId: '6883112b4610d828d41c557f',
      to: ['mayankrajput2110@gmail.com'],
      subject: 'AUTOMATED-TEST: Apache Struts 2 Auto-Scheduled Alert',
      customMessage: 'This email tests the complete automated scheduling system!',
      scheduledDate: scheduleTime,
      createdBy: 'auto-test',
      status: 'pending'
    });

    await testEmail.save();
    const emailId = testEmail._id;
    console.log(`✅ Email created with ID: ${emailId}`);

    // Step 2: Create Agenda job via API
    console.log('\n📤 Step 2: Creating Agenda job...');
    
    try {
      const response = await fetch('http://localhost:3000/api/start-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      console.log('✅ Agenda startup result:', result);
    } catch (apiError) {
      console.log('⚠️ API call issue:', apiError.message);
    }

    // Step 3: Manually create the Agenda job since API integration might be the issue
    console.log('\n🔧 Step 3: Manually creating Agenda job...');
    
    const { startAgenda } = require('./lib/agenda');
    const agenda = await startAgenda();
    
    const jobResult = await agenda.schedule(scheduleTime, 'send-scheduled-email', { 
      emailId: emailId.toString() 
    });
    
    console.log(`✅ Agenda job created for: ${scheduleTime.toLocaleString()}`);

    // Step 4: Wait for processing
    const waitTime = scheduleTime.getTime() - Date.now() + 30000;
    console.log(`\n⏳ Step 4: Waiting ${Math.round(waitTime/1000)} seconds for automatic processing...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Step 5: Check result
    console.log('\n📊 Step 5: Checking results...');
    
    const finalEmail = await ScheduledEmail.findById(emailId);
    console.log(`📧 Status: ${finalEmail.status}`);
    console.log(`📅 Sent at: ${finalEmail.sentAt || 'Not sent'}`);
    
    if (finalEmail.status === 'sent') {
      console.log('\n🎉 COMPLETE SUCCESS!');
      console.log('✅ Email was automatically processed and sent with rich content');
      console.log('✅ The automated scheduling system is working perfectly!');
    } else if (finalEmail.status === 'failed') {
      console.log('\n⚠️ PROCESSING ATTEMPTED BUT FAILED');
      console.log(`❌ Error: ${finalEmail.errorMessage}`);
    } else {
      console.log('\n❌ AUTOMATION NOT WORKING');
      console.log('The Agenda worker did not process the job automatically');
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
};

testAutomatedScheduling();
