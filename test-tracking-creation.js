// Test the exact tracking creation process used in email sending
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

async function testTrackingCreation() {
  try {
    console.log('🧪 Testing exact tracking creation process...\n');

    // Connect exactly like the email sending process does
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Check initial count
    const initialCount = await trackingCollection.countDocuments();
    console.log(`📊 Initial tracking records: ${initialCount}`);

    // Simulate the exact process from send-advisory.js
    const advisoryId = 'test-advisory-id';
    const trackingOptions = { enableTracking: true };
    const testEmails = ['mayankrajput2110@gmail.com', 'shiva.dasadiya@gmail.com'];

    console.log('\n🔄 Creating tracking records...');

    for (const email of testEmails) {
      const trackingId = crypto.randomUUID();
      const trackingRecord = {
        emailId: advisoryId,
        recipientEmail: email,
        trackingId,
        events: [],
        openCount: 0,
        createdAt: new Date(),
        trackingOptions
      };

      console.log(`   📝 Attempting to insert: ${email} -> ${trackingId}`);
      
      try {
        const result = await trackingCollection.insertOne(trackingRecord);
        console.log(`   ✅ Inserted successfully: ${result.insertedId}`);
      } catch (insertError) {
        console.log(`   ❌ Insert failed: ${insertError.message}`);
      }
    }

    // Check final count
    const finalCount = await trackingCollection.countDocuments();
    console.log(`\n📊 Final tracking records: ${finalCount}`);
    console.log(`📈 Records added: ${finalCount - initialCount}`);

    // List recent records
    const recentRecords = await trackingCollection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    console.log('\n📧 Recent records:');
    recentRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.recipientEmail} (${record.trackingId}) - ${record.createdAt}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTrackingCreation();
