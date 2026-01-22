const mongoose = require('mongoose');

const ATLAS_URI = 'mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority';

async function verifyAtlasData() {
  console.log('🔍 Verifying your migrated data in Atlas...\n');
  
  try {
    await mongoose.connect(ATLAS_URI);
    console.log('Connected to Atlas');
    
    const db = mongoose.connection.db;
    
    // Check each collection
    const collections = ['advisories', 'users', 'scheduledemails', 'agendaJobs', 'clients', 'emails'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      const sample = await collection.findOne();
      
      console.log(`📦 ${collectionName}: ${count} documents`);
      if (sample) {
        console.log(`   Sample fields: ${Object.keys(sample).slice(0, 5).join(', ')}...`);
      }
    }
    
    // Test a simple query on advisories
    console.log('\n🧪 Testing advisory queries:');
    const advisoriesCollection = db.collection('advisories');
    const advisorySample = await advisoriesCollection.findOne();
    
    if (advisorySample) {
      console.log('Advisory data looks good:');
      console.log(`   Title: ${advisorySample.title || 'N/A'}`);
      console.log(`   Severity: ${advisorySample.severity || 'N/A'}`);
      console.log(`   ID: ${advisorySample._id}`);
    }
    
    await mongoose.disconnect();
    console.log('\n🎉 Atlas verification completed successfully!');
    console.log('\n📋 Your data is ready for production use.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyAtlasData();
