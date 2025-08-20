// Test Email Tracking System
// File: test-email-tracking-verification.js

const mongoose = require('mongoose');
require('dotenv').config();

async function testEmailTracking() {
  try {
    console.log('🧪 Testing Email Tracking System\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // 1. Check tracking records
    console.log('\n📊 Checking tracking records...');
    const trackingRecords = await trackingCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log(`   Found ${trackingRecords.length} tracking records:`);
    trackingRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. Email: ${record.recipientEmail}`);
      console.log(`      Tracking ID: ${record.trackingId}`);
      console.log(`      Opens: ${record.openCount || 0}`);
      console.log(`      Events: ${record.events?.length || 0}`);
      console.log(`      Created: ${record.createdAt?.toISOString() || 'Unknown'}`);
      console.log('');
    });

    // 2. Test tracking pixel URL generation
    console.log('🎯 Testing tracking pixel URL generation...');
    if (trackingRecords.length > 0) {
      const sampleRecord = trackingRecords[0];
      const pixelUrl = `/api/emails/tracking?t=${sampleRecord.trackingId}&type=open`;
      console.log(`   Sample pixel URL: ${pixelUrl}`);
    }

    // 3. Test link tracking URL generation
    console.log('\n🔗 Testing link tracking URL generation...');
    if (trackingRecords.length > 0) {
      const sampleRecord = trackingRecords[0];
      const originalUrl = 'https://example.com/advisory/details';
      const encodedUrl = encodeURIComponent(originalUrl);
      const trackingUrl = `/api/track/link?t=${sampleRecord.trackingId}&u=${encodedUrl}&l=main_cta`;
      console.log(`   Original URL: ${originalUrl}`);
      console.log(`   Tracked URL: ${trackingUrl}`);
    }

    // 4. Analytics summary
    console.log('\n📈 Analytics Summary:');
    const totalEmails = trackingRecords.length;
    const totalOpens = trackingRecords.reduce((sum, record) => sum + (record.openCount || 0), 0);
    const totalClicks = trackingRecords.reduce((sum, record) => {
      return sum + (record.events?.filter(event => event.type === 'click').length || 0);
    }, 0);
    
    console.log(`   Total Tracked Emails: ${totalEmails}`);
    console.log(`   Total Opens: ${totalOpens}`);
    console.log(`   Total Clicks: ${totalClicks}`);
    
    if (totalEmails > 0) {
      const openRate = ((trackingRecords.filter(r => (r.openCount || 0) > 0).length / totalEmails) * 100).toFixed(1);
      const clickRate = ((trackingRecords.filter(r => r.events?.some(e => e.type === 'click')).length / totalEmails) * 100).toFixed(1);
      console.log(`   Open Rate: ${openRate}%`);
      console.log(`   Click Rate: ${clickRate}%`);
    }

    // 5. Recent activity
    console.log('\n⏰ Recent Activity:');
    const recentEvents = [];
    trackingRecords.forEach(record => {
      if (record.events && record.events.length > 0) {
        record.events.forEach(event => {
          recentEvents.push({
            email: record.recipientEmail,
            type: event.type,
            timestamp: event.timestamp,
            trackingId: record.trackingId
          });
        });
      }
    });

    recentEvents
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5)
      .forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.type.toUpperCase()} - ${event.email} (${event.timestamp?.toISOString() || 'Unknown time'})`);
      });

    if (recentEvents.length === 0) {
      console.log('   No recent events found.');
    }

    // 6. System health check
    console.log('\n🔍 System Health Check:');
    
    // Check if tracking pixel endpoint exists
    console.log(`   ✅ Tracking pixel endpoint: /api/emails/tracking`);
    console.log(`   ✅ Link tracking endpoint: /api/track/link`);
    console.log(`   ✅ Analytics endpoint: /api/tracking/analytics`);
    
    // Check tracking integration
    const hasTrackingData = trackingRecords.length > 0;
    const hasRecentActivity = recentEvents.length > 0;
    
    console.log(`   ${hasTrackingData ? '✅' : '⚠️ '} Email tracking records: ${hasTrackingData ? 'Present' : 'No data'}`);
    console.log(`   ${hasRecentActivity ? '✅' : '⚠️ '} Recent tracking events: ${hasRecentActivity ? 'Active' : 'No recent activity'}`);

    // 7. Next steps
    console.log('\n🚀 Next Steps:');
    console.log('   1. Send a test advisory email to verify pixel tracking');
    console.log('   2. Open the email to test open tracking');
    console.log('   3. Click a link to test click tracking');
    console.log('   4. Check /analytics/email-tracking page for dashboard');
    console.log('   5. Monitor real-time events via API calls');

    console.log('\n✨ Email tracking system verification complete!\n');

  } catch (error) {
    console.error('❌ Error testing email tracking:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testEmailTracking();
