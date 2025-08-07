const mongoose = require('mongoose');

// Test Atlas connection
const ATLAS_URI = 'mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority';

async function testAtlasConnection() {
  console.log('🧪 Testing MongoDB Atlas connection...');
  
  try {
    // Connect to Atlas
    await mongoose.connect(ATLAS_URI);
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database operations
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections in Atlas:`, collections.map(c => c.name));
    
    // Test if we can create a test document
    const testCollection = db.collection('connection-test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ Successfully inserted test document');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('✅ Cleaned up test document');
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from Atlas');
    
    return true;
    
  } catch (error) {
    console.error('❌ Atlas connection failed:', error.message);
    return false;
  }
}

// Test local MongoDB connection
async function testLocalConnection() {
  console.log('\n🧪 Testing Local MongoDB connection...');
  
  const LOCAL_URI = 'mongodb://localhost:27017/threat-advisory';
  
  try {
    await mongoose.connect(LOCAL_URI);
    console.log('✅ Successfully connected to Local MongoDB!');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections locally:`, collections.map(c => c.name));
    
    // Count documents in each collection
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   📦 ${collection.name}: ${count} documents`);
    }
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from Local MongoDB');
    
    return { success: true, collections };
    
  } catch (error) {
    console.error('❌ Local MongoDB connection failed:', error.message);
    console.error('💡 Make sure MongoDB is running locally on port 27017');
    return { success: false };
  }
}

async function main() {
  console.log('🌟 MongoDB Connection Test\n');
  
  // Test Atlas first
  const atlasWorking = await testAtlasConnection();
  
  // Test Local
  const localResult = await testLocalConnection();
  
  console.log('\n📊 Connection Summary:');
  console.log(`   Atlas: ${atlasWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Local: ${localResult.success ? '✅ Working' : '❌ Failed'}`);
  
  if (atlasWorking && localResult.success) {
    console.log('\n🚀 Both connections working! Ready for migration.');
    console.log(`📋 Collections to migrate: ${localResult.collections?.length || 0}`);
  } else {
    console.log('\n⚠️ Fix connection issues before proceeding with migration.');
  }
}

main().catch(console.error);
