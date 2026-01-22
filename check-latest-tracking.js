// Check for the specific tracking ID from the latest email send
const mongoose = require('mongoose');
require('dotenv').config();

async function checkLatestTracking() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Check for the specific tracking ID from the logs: 9e3f0867-3486-4e36-a3f7-5a77d090deb8
    const specificRecord = await trackingCollection.findOne({ trackingId: '9e3f0867-3486-4e36-a3f7-5a77d090deb8' });
    
    if (specificRecord) {
      console.log('Found the specific tracking record:');
      console.log(`   Email: ${specificRecord.recipientEmail}`);
      console.log(`   Tracking ID: ${specificRecord.trackingId}`);
      console.log(`   Created: ${specificRecord.createdAt}`);
      console.log(`   Opens: ${specificRecord.openCount || 0}`);
    } else {
      console.log('❌ Specific tracking record NOT found');
    }

    // Get all recent records
    const allRecords = await trackingCollection.find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    console.log(`\n📊 Total tracking records: ${allRecords.length}`);
    console.log('\n📧 All recent tracking records:');
    allRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.recipientEmail} (${record.trackingId}) - ${record.createdAt}`);
    });

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLatestTracking();
