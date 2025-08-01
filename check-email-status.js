// Diagnostic script to check email status
require('dotenv').config();

const Email = require('./lib/emailModel');
const mongoose = require('mongoose');

const checkEmailStatus = async () => {
  console.log('🔍 Checking email database status...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Get all emails
    const allEmails = await Email.find({}).sort({ createdAt: -1 });
    console.log(`📧 Total emails in database: ${allEmails.length}\n`);

    if (allEmails.length > 0) {
      console.log('📋 Recent emails:');
      allEmails.slice(0, 5).forEach((email, index) => {
        console.log(`${index + 1}. To: ${email.to}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Status: ${email.status}`);
        console.log(`   Scheduled: ${email.scheduledAt}`);
        console.log(`   Created: ${email.createdAt}`);
        console.log(`   Sent: ${email.sentAt || 'Not sent'}`);
        if (email.error) console.log(`   Error: ${email.error}`);
        console.log('');
      });

      // Check pending emails specifically
      const pendingEmails = await Email.find({ status: 'scheduled' });
      console.log(`⏳ Pending emails: ${pendingEmails.length}`);

      const sentEmails = await Email.find({ status: 'sent' });
      console.log(`✅ Sent emails: ${sentEmails.length}`);

      const failedEmails = await Email.find({ status: 'failed' });
      console.log(`❌ Failed emails: ${failedEmails.length}`);

      // Check if there are emails that should have been sent by now
      const now = new Date();
      const overdueEmails = await Email.find({
        status: 'scheduled',
        scheduledAt: { $lte: now }
      });
      console.log(`\n🚨 Overdue emails (should have been sent): ${overdueEmails.length}`);
      
      if (overdueEmails.length > 0) {
        console.log('Overdue emails details:');
        overdueEmails.forEach((email, index) => {
          console.log(`${index + 1}. ${email.to} - ${email.subject}`);
          console.log(`   Scheduled: ${email.scheduledAt}`);
          console.log(`   Current time: ${now}`);
          console.log(`   Overdue by: ${Math.round((now - new Date(email.scheduledAt)) / 1000 / 60)} minutes`);
        });
      }
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkEmailStatus();
