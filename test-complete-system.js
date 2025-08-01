// Complete end-to-end test of automated email scheduling system
require('dotenv').config();

const testCompleteSchedulingSystem = async () => {
  console.log('🧪 COMPLETE END-TO-END AUTOMATED SCHEDULING TEST');
  console.log('================================================');
  
  try {
    // Step 1: Create a scheduled email via the web API (simulating user action)
    console.log('\n📤 Step 1: Creating scheduled email via web API...');
    
    const scheduleTime = new Date(Date.now() + 90000); // 1.5 minutes from now
    console.log(`⏰ Scheduling for: ${scheduleTime.toLocaleString()}`);
    
    // First get a login token (simulate admin login)
    console.log('🔐 Getting admin token...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Failed to login as admin');
    }
    
    const loginData = await loginResponse.json();
    const authToken = loginData.token;
    console.log('✅ Admin token obtained');
    
    // Create scheduled email via API
    const scheduleResponse = await fetch('http://localhost:3000/api/scheduled-emails', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        advisoryId: '6883112b4610d828d41c557f',
        to: ['mayankrajput2110@gmail.com'],
        subject: 'COMPLETE-TEST: Apache Struts 2 Auto-Scheduled Alert',
        customMessage: 'This email was automatically scheduled and sent via the complete system!',
        scheduledDate: scheduleTime.toISOString()
      })
    });
    
    if (!scheduleResponse.ok) {
      const errorText = await scheduleResponse.text();
      throw new Error(`Failed to schedule email: ${errorText}`);
    }
    
    const scheduleData = await scheduleResponse.json();
    const emailId = scheduleData.scheduledEmail._id;
    console.log(`✅ Email scheduled successfully with ID: ${emailId}`);
    
    // Step 2: Verify Agenda job was created
    console.log('\n🔍 Step 2: Verifying Agenda job creation...');
    
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    
    const agendaJobs = await mongoose.connection.db.collection('agendaJobs').find({
      'data.emailId': emailId
    }).toArray();
    
    if (agendaJobs.length === 0) {
      throw new Error('No Agenda job found for the scheduled email');
    }
    
    const job = agendaJobs[0];
    console.log(`✅ Agenda job found: ${job.name}`);
    console.log(`📅 Next run: ${new Date(job.nextRunAt).toLocaleString()}`);
    
    // Step 3: Wait for automatic processing
    console.log('\n⏳ Step 3: Waiting for automatic processing...');
    
    const waitTime = scheduleTime.getTime() - Date.now() + 30000; // Wait extra 30 seconds
    console.log(`⏳ Waiting ${Math.round(waitTime/1000)} seconds for automatic processing...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Step 4: Verify email was sent automatically
    console.log('\n📊 Step 4: Verifying automatic email sending...');
    
    const ScheduledEmailSchema = new mongoose.Schema({}, { strict: false });
    const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
    
    const finalEmail = await ScheduledEmail.findById(emailId);
    
    console.log(`📧 Final email status: ${finalEmail.status}`);
    console.log(`📅 Sent at: ${finalEmail.sentAt || 'Not sent'}`);
    
    if (finalEmail.status === 'sent') {
      console.log('\n🎉 SUCCESS! COMPLETE AUTOMATED SYSTEM WORKS!');
      console.log('✅ Email was scheduled via web interface');
      console.log('✅ Agenda job was automatically created');
      console.log('✅ Email was automatically sent with rich content');
      console.log('✅ Status was properly updated');
    } else if (finalEmail.status === 'failed') {
      console.log('\n❌ PARTIAL SUCCESS - Email was processed but failed to send');
      console.log(`Error: ${finalEmail.errorMessage}`);
    } else {
      console.log('\n⚠️ ISSUE - Email is still pending after scheduled time');
      console.log('This indicates the Agenda worker may not be processing jobs automatically');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
};

testCompleteSchedulingSystem();
