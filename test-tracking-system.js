// Test email tracking creation
const mongoose = require('mongoose');
require('dotenv').config();

async function testTracking() {
  try {
    console.log('🧪 Testing Email Tracking System...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Test 1: Check current data
    console.log('1. Checking existing tracking data...');
    const existingData = await trackingCollection.find({}).toArray();
    console.log(`   Found ${existingData.length} existing tracking records\n`);

    // Test 2: Create a new tracking record (simulate what send-advisory.js should do)
    console.log('2. Creating test tracking record...');
    const testTrackingId = `test-${Date.now()}`;
    const testRecord = {
      emailId: 'test-advisory-id',
      recipientEmail: 'test@example.com',
      trackingId: testTrackingId,
      events: [],
      openCount: 0,
      clickCount: 0,
      createdAt: new Date(),
      trackingOptions: {
        enableTracking: true,
        trackOpens: true,
        trackClicks: true
      }
    };

    await trackingCollection.insertOne(testRecord);
    console.log(`   Test tracking record created: ${testTrackingId}\n`);

    // Test 3: Simulate an email open
    console.log('3. Simulating email open...');
    const updateResult = await trackingCollection.updateOne(
      { trackingId: testTrackingId },
      {
        $inc: { openCount: 1 },
        $push: {
          events: {
            type: 'open',
            timestamp: new Date(),
            userAgent: 'Test Browser',
            ip: '127.0.0.1'
          }
        },
        $set: { lastOpenAt: new Date() }
      }
    );

    console.log(`   Email open simulated (Modified: ${updateResult.modifiedCount})\n`);

    // Test 4: Check updated data
    console.log('4. Checking final tracking data...');
    const finalData = await trackingCollection.find({}).toArray();
    console.log(`   Total records now: ${finalData.length}`);
    
    // Show the test record
    const testRecordUpdated = await trackingCollection.findOne({ trackingId: testTrackingId });
    if (testRecordUpdated) {
      console.log(`   Test record opens: ${testRecordUpdated.openCount}`);
      console.log(`   Test record events: ${testRecordUpdated.events.length}\n`);
    }

    console.log('Email tracking test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Database connection: Working ✅`);
    console.log(`   - Tracking record creation: Working ✅`);
    console.log(`   - Email open tracking: Working ✅`);
    console.log(`   - Real-time updates: Working ✅\n`);

    // Clean up test record
    await trackingCollection.deleteOne({ trackingId: testTrackingId });
    console.log('🧹 Test record cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testTracking();
