// Check if there's any tracking data in the database
const mongoose = require('mongoose');
require('dotenv').config();

async function checkTrackingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');
    
    const trackingData = await trackingCollection.find({}).toArray();
    
    console.log('📊 Email Tracking Data:');
    console.log(`   Total tracking records: ${trackingData.length}`);
    
    if (trackingData.length > 0) {
      console.log('\n📧 Recent tracking records:');
      trackingData.slice(-5).forEach((record, index) => {
        console.log(`   ${index + 1}. Email: ${record.recipientEmail}`);
        console.log(`      Tracking ID: ${record.trackingId}`);
        console.log(`      Opens: ${record.openCount || 0}`);
        console.log(`      Events: ${record.events ? record.events.length : 0}`);
        console.log(`      Created: ${record.createdAt}`);
        console.log('');
      });
    } else {
      console.log('   No tracking data found. This could mean:');
      console.log('   - No emails have been sent with tracking enabled yet');
      console.log('   - Tracking data is stored in a different collection');
      console.log('   - Database connection issues');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkTrackingData();
