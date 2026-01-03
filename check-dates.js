const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory';

async function checkDates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Advisory = mongoose.model('Advisory', new mongoose.Schema({}, { strict: false }));
    
    // Get latest 3 advisories
    const advisories = await Advisory.find().sort({ createdAt: -1 }).limit(3);

    console.log('\n=== CHECKING PUBLISHED DATES ===\n');
    
    advisories.forEach((adv, idx) => {
      console.log(`Advisory ${idx + 1}:`);
      console.log(`  ID: ${adv._id}`);
      console.log(`  Title: ${adv.title}`);
      console.log(`  Created At: ${adv.createdAt}`);
      console.log(`  Updated At: ${adv.updatedAt}`);
      console.log(`  Published Date: ${adv.publishedDate}`);
      console.log(`  Published Date Type: ${typeof adv.publishedDate}`);
      console.log(`  Published Date is Valid: ${adv.publishedDate instanceof Date && !isNaN(adv.publishedDate)}`);
      console.log();
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDates();
