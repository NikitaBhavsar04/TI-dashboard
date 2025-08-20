// Manual Email Tracking Test
// This script manually creates tracking events to test the system

const mongoose = require('mongoose');
require('dotenv').config();

async function manualTrackingTest() {
  try {
    console.log('🧪 Manual Email Tracking Test\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Get an existing tracking record to test with
    const existingRecord = await trackingCollection.findOne({ trackingId: '1598bd97-f884-4e84-9dba-5a974f3c9371' });
    
    if (existingRecord) {
      console.log(`📧 Found tracking record for: ${existingRecord.recipientEmail}`);
      
      // Manually add an open event
      const openEvent = {
        type: 'open',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Manual Test Browser',
        device: {
          type: 'desktop',
          os: 'Windows',
          browser: 'Chrome'
        }
      };

      console.log('🔄 Manually adding open event...');
      
      const updateResult = await trackingCollection.updateOne(
        { trackingId: '1598bd97-f884-4e84-9dba-5a974f3c9371' },
        {
          $push: { events: openEvent },
          $inc: { openCount: 1 },
          $set: { lastOpened: new Date() }
        }
      );

      console.log(`✅ Update result: Modified ${updateResult.modifiedCount} documents`);

      // Verify the update
      const updatedRecord = await trackingCollection.findOne({ trackingId: '1598bd97-f884-4e84-9dba-5a974f3c9371' });
      console.log(`📊 Updated stats: ${updatedRecord.openCount} opens, ${updatedRecord.events?.length || 0} total events`);

      // Add a click event too
      const clickEvent = {
        type: 'click',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Manual Test Browser',
        linkUrl: 'https://example.com/test-link',
        linkId: 'test_link',
        device: {
          type: 'desktop',
          os: 'Windows',
          browser: 'Chrome'
        }
      };

      console.log('🔄 Manually adding click event...');
      
      const clickUpdateResult = await trackingCollection.updateOne(
        { trackingId: '1598bd97-f884-4e84-9dba-5a974f3c9371' },
        {
          $push: { events: clickEvent },
          $inc: { clickCount: 1 }
        }
      );

      console.log(`✅ Click update result: Modified ${clickUpdateResult.modifiedCount} documents`);

      // Final verification
      const finalRecord = await trackingCollection.findOne({ trackingId: '1598bd97-f884-4e84-9dba-5a974f3c9371' });
      console.log(`\n📊 Final stats for ${finalRecord.recipientEmail}:`);
      console.log(`   Opens: ${finalRecord.openCount || 0}`);
      console.log(`   Clicks: ${finalRecord.clickCount || 0}`);
      console.log(`   Total events: ${finalRecord.events?.length || 0}`);
      console.log(`   Last opened: ${finalRecord.lastOpened?.toISOString() || 'Never'}`);

      console.log('\n✅ Manual tracking events added successfully!');
      console.log('🔄 Now check the dashboard to see if real-time data appears.');

    } else {
      console.log('❌ No existing tracking record found');
    }

  } catch (error) {
    console.error('❌ Error in manual tracking test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Test completed');
  }
}

manualTrackingTest();
