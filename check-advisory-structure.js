// Check full advisory structure
require('dotenv').config();

const mongoose = require('mongoose');

const AdvisorySchema = new mongoose.Schema({}, { strict: false }); // Accept any fields
const Advisory = mongoose.models.Advisory || mongoose.model('Advisory', AdvisorySchema);

const checkAdvisoryStructure = async () => {
  console.log('🔍 Checking advisory data structure...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Find the advisory
    const advisory = await Advisory.findById('6883112b4610d828d41c557f');
    
    if (advisory) {
      console.log(`📄 Full advisory data:`);
      console.log(JSON.stringify(advisory, null, 2));
    } else {
      console.log(`❌ Advisory not found`);
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
};

checkAdvisoryStructure();
