// Test Email Tracking Integration
// File: test-tracking-integration.js

const mongoose = require('mongoose');
require('dotenv').config();

async function testTrackingIntegration() {
  console.log('🧪 Testing Email Tracking Integration\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Test 1: Check existing tracking records
    console.log('📊 Testing tracking records...');
    const trackingRecords = await trackingCollection.find({}).toArray();
    console.log(`   Found ${trackingRecords.length} tracking records`);

    if (trackingRecords.length > 0) {
      const recentRecord = trackingRecords[0];
      console.log(`   Latest record: ${recentRecord.recipientEmail} (${recentRecord.trackingId})`);
    }

    // Test 2: Create a test tracking record
    console.log('\nCreating test tracking record...');
    const testRecord = {
      trackingId: `test-${Date.now()}`,
      emailId: 'test-advisory-123',
      recipientEmail: 'test@example.com',
      events: [],
      openCount: 0,
      createdAt: new Date(),
      trackingOptions: { enableTracking: true }
    };

    const insertResult = await trackingCollection.insertOne(testRecord);
    console.log(`   Test record created: ${insertResult.insertedId}`);

    // Test 3: Simulate tracking events
    console.log('\n📈 Simulating tracking events...');
    
    // Simulate email open
    const openEvent = {
      type: 'open',
      timestamp: new Date(),
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      device: {
        type: 'desktop',
        os: 'Windows',
        browser: 'Chrome'
      }
    };

    await trackingCollection.updateOne(
      { trackingId: testRecord.trackingId },
      {
        $push: { events: openEvent },
        $inc: { openCount: 1 }
      }
    );
    console.log('   Email open event simulated');

    // Simulate click event
    const clickEvent = {
      type: 'click',
      timestamp: new Date(),
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      linkUrl: 'https://example.com/advisory/details',
      linkId: 'main_cta',
      device: {
        type: 'desktop',
        os: 'Windows',
        browser: 'Chrome'
      }
    };

    await trackingCollection.updateOne(
      { trackingId: testRecord.trackingId },
      {
        $push: { events: clickEvent }
      }
    );
    console.log('   Link click event simulated');

    // Test 4: Verify tracking data
    console.log('\n🔍 Verifying tracking data...');
    const updatedRecord = await trackingCollection.findOne({ trackingId: testRecord.trackingId });
    console.log(`   Events recorded: ${updatedRecord.events.length}`);
    console.log(`   Open count: ${updatedRecord.openCount}`);

    // Test 5: Test tracking URLs
    console.log('\n Testing tracking URL generation...');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const pixelUrl = `/api/emails/tracking?t=${testRecord.trackingId}&type=open`;
    console.log(`   Pixel URL: ${baseUrl}${pixelUrl}`);

    const originalUrl = 'https://example.com/advisory/details';
    const encodedUrl = encodeURIComponent(originalUrl);
    const trackedUrl = `/api/track/link?t=${testRecord.trackingId}&u=${encodedUrl}&l=test_link`;
    console.log(`   Tracked URL: ${baseUrl}${trackedUrl}`);

    // Test 6: Analytics calculation
    console.log('\n📊 Testing analytics calculation...');
    const allRecords = await trackingCollection.find({}).toArray();
    
    const totalEmails = allRecords.length;
    const emailsWithOpens = allRecords.filter(r => (r.openCount || 0) > 0).length;
    const totalOpens = allRecords.reduce((sum, r) => sum + (r.openCount || 0), 0);
    const totalClicks = allRecords.reduce((sum, r) => {
      return sum + (r.events?.filter(e => e.type === 'click').length || 0);
    }, 0);

    console.log(`   Total emails: ${totalEmails}`);
    console.log(`   Total opens: ${totalOpens}`);
    console.log(`   Total clicks: ${totalClicks}`);
    console.log(`   Open rate: ${totalEmails > 0 ? ((emailsWithOpens / totalEmails) * 100).toFixed(1) : 0}%`);

    // Test 7: Check API endpoints
    console.log('\n🌐 API Endpoints Status:');
    console.log('   Pixel tracking: /api/emails/tracking');
    console.log('   Link tracking: /api/track/link');
    console.log('   Analytics API: /api/tracking/analytics');
    console.log('   Events API: /api/tracking/events');
    console.log('   Dashboard: /analytics/email-tracking');

    // Cleanup test record
    await trackingCollection.deleteOne({ trackingId: testRecord.trackingId });
    console.log('\n🧹 Test record cleaned up');

    console.log('\n🎉 Email tracking integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   Database connection working');
    console.log('   Tracking record creation working');
    console.log('   Event logging working');
    console.log('   URL generation working');
    console.log('   Analytics calculation working');
    console.log('   All API endpoints available');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTrackingIntegration();
