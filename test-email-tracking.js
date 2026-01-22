// Test Email Tracking System
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function testTracking() {
  try {
    console.log('🔍 Testing Email Tracking System...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get ScheduledEmail model
    const ScheduledEmailSchema = new mongoose.Schema({}, { strict: false });
    const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
    
    // Find all sent emails
    const sentEmails = await ScheduledEmail.find({ status: 'sent' })
      .sort({ sentAt: -1 })
      .limit(10);
    
    console.log(`\n📧 Found ${sentEmails.length} sent emails\n`);
    
    if (sentEmails.length === 0) {
      console.log('ℹ️  No sent emails found. Send an email first to test tracking.');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    sentEmails.forEach((email, index) => {
      console.log(`\n${index + 1}. Email: ${email.subject}`);
      console.log(`   To: ${email.to.join(', ')}`);
      console.log(`   Sent: ${email.sentAt}`);
      console.log(`   Tracking ID: ${email.trackingId || 'NOT SET ❌'}`);
      console.log(`   Is Opened: ${email.isOpened ? 'YES' : '❌ NO'}`);
      console.log(`   Opens Count: ${email.opens?.length || 0}`);
      
      if (email.openedAt) {
        console.log(`   First Opened: ${email.openedAt}`);
      }
      
      if (email.opens && email.opens.length > 0) {
        console.log(`   Open Events:`);
        email.opens.forEach((open, i) => {
          console.log(`     ${i + 1}. ${open.timestamp} - IP: ${open.ipAddress}`);
        });
      }
      
      if (!email.trackingId) {
        console.log(`   ⚠️  WARNING: This email has no tracking ID!`);
      }
    });
    
    console.log('\n\n📊 Summary:');
    const withTracking = sentEmails.filter(e => e.trackingId).length;
    const opened = sentEmails.filter(e => e.isOpened).length;
    
    console.log(`   Emails with tracking: ${withTracking}/${sentEmails.length}`);
    console.log(`   Emails opened: ${opened}/${sentEmails.length}`);
    
    if (withTracking < sentEmails.length) {
      console.log('\n⚠️  Some emails are missing tracking IDs!');
      console.log('   These emails were sent BEFORE the tracking system was implemented.');
      console.log('\n💡 Solution: Send a NEW email to test tracking.');
    }
    
    if (opened === 0 && withTracking > 0) {
      console.log('\n💡 To test tracking:');
      console.log('   1. Open one of the sent emails in your email client');
      console.log('   2. Make sure images are enabled in your email client');
      console.log('   3. Check server logs for: [TRACKING] Pixel loaded');
      console.log('   4. Wait 10 seconds and the UI will auto-refresh');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testTracking();
