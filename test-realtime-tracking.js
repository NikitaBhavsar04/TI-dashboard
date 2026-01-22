// Real-time Email Tracking Test Script
// This script tests the complete tracking flow

const mongoose = require('mongoose');
require('dotenv').config();

async function testRealTimeTracking() {
  try {
    console.log('🧪 Testing Real-time Email Tracking System\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // 1. Check for any recent tracking records
    console.log('\n📊 Checking recent tracking records...');
    const recentRecords = await trackingCollection.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`Found ${recentRecords.length} tracking records:`);
    
    if (recentRecords.length > 0) {
      recentRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.recipientEmail || 'Unknown'}`);
        console.log(`      Tracking ID: ${record.trackingId}`);
        console.log(`      Opens: ${record.openCount || 0}`);
        console.log(`      Events: ${record.events?.length || 0}`);
        console.log(`      Created: ${record.createdAt?.toISOString() || 'Unknown'}`);
        console.log('');
      });

      // 2. Show recent events from the last 24 hours
      console.log('\n📝 Recent tracking events (last 24 hours):');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const pipeline = [
        {
          $match: {
            'events.timestamp': { $gte: oneDayAgo }
          }
        },
        {
          $unwind: '$events'
        },
        {
          $match: {
            'events.timestamp': { $gte: oneDayAgo }
          }
        },
        {
          $sort: { 'events.timestamp': -1 }
        },
        {
          $limit: 20
        },
        {
          $project: {
            trackingId: 1,
            recipientEmail: 1,
            emailId: 1,
            'events.type': 1,
            'events.timestamp': 1,
            'events.ipAddress': 1,
            'events.linkUrl': 1
          }
        }
      ];

      const recentEvents = await trackingCollection.aggregate(pipeline).toArray();
      
      if (recentEvents.length > 0) {
        console.log(`   Found ${recentEvents.length} recent events:`);
        recentEvents.forEach((event, index) => {
          const timeAgo = Math.floor((Date.now() - new Date(event.events.timestamp).getTime()) / 1000 / 60);
          console.log(`   ${index + 1}. ${event.events.type.toUpperCase()}: ${event.recipientEmail} (${timeAgo} min ago)`);
          if (event.events.linkUrl) {
            console.log(`      Link: ${event.events.linkUrl}`);
          }
        });
      } else {
        console.log('   No recent events found in the last 24 hours');
      }

      // 3. Calculate basic statistics
      console.log('\n📈 Current Statistics:');
      const totalEmails = await trackingCollection.countDocuments({});
      const emailsWithOpens = await trackingCollection.countDocuments({ openCount: { $gt: 0 } });
      const totalOpens = await trackingCollection.aggregate([
        { $group: { _id: null, total: { $sum: '$openCount' } } }
      ]).toArray();

      console.log(`   Total emails sent: ${totalEmails}`);
      console.log(`   Emails opened: ${emailsWithOpens}`);
      console.log(`   Total opens: ${totalOpens[0]?.total || 0}`);
      console.log(`   Open rate: ${totalEmails > 0 ? ((emailsWithOpens / totalEmails) * 100).toFixed(1) + '%' : '0%'}`);

    } else {
      console.log('❌ No tracking records found.');
      console.log('   This means either:');
      console.log('   - No emails have been sent yet');
      console.log('   - Tracking is not enabled');
      console.log('   - There\'s an issue with tracking initialization');
    }

    // 4. Test tracking API endpoints
    console.log('\n Testing API endpoints...');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log(`   Base URL: ${baseUrl}`);
    
    if (recentRecords.length > 0) {
      const sampleRecord = recentRecords[0];
      console.log(`   📸 Pixel URL: ${baseUrl}/api/emails/tracking?t=${sampleRecord.trackingId}&type=open`);
      console.log(`   📊 Events API: ${baseUrl}/api/tracking/events?timeRange=24h`);
      console.log(`   📈 Analytics API: ${baseUrl}/api/tracking/analytics?dateRange=7d`);
    }

    // 5. Recommendations
    console.log('\n💡 Recommendations:');
    if (recentRecords.length === 0) {
      console.log('   1. Send a test advisory email to verify tracking setup');
      console.log('   2. Ensure tracking is enabled in email sending options');
      console.log('   3. Check that the email template includes the tracking pixel');
    } else if (recentEvents.length === 0) {
      console.log('   1. Open one of the sent emails to test tracking');
      console.log('   2. Click a link in the email to test click tracking');
      console.log('   3. Refresh the analytics dashboard to see real-time data');
    } else {
      console.log('   Tracking system appears to be working correctly!');
      console.log('   1. Check the analytics dashboard for real-time updates');
      console.log('   2. Monitor tracking events as emails are opened');
    }

  } catch (error) {
    console.error('❌ Error testing tracking system:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Test completed');
  }
}

testRealTimeTracking();
