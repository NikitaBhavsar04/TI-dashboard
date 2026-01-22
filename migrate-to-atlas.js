const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Connection strings
const LOCAL_URI = 'mongodb://localhost:27017/threat-advisory';
const ATLAS_URI = 'mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority';

async function migrateData() {
  console.log('🚀 Starting migration from Local MongoDB to Atlas...\n');
  
  let localClient, atlasClient;
  
  try {
    // Connect to local MongoDB
    console.log('📡 Connecting to Local MongoDB...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    console.log('Connected to Local MongoDB\n');
    
    // Connect to Atlas
    console.log('☁️ Connecting to MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    console.log('Connected to MongoDB Atlas\n');
    
    // Get databases
    const localDb = localClient.db('threat-advisory');
    const atlasDb = atlasClient.db('threat-advisory');
    
    // Get all collections from local database
    console.log('📋 Fetching collections from local database...');
    const collections = await localDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`, collections.map(c => c.name));
    console.log('');
    
    if (collections.length === 0) {
      console.log('⚠️ No collections found in local database. Make sure your local MongoDB is running and has data.');
      return;
    }
    
    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`📦 Migrating collection: ${collectionName}`);
      
      try {
        // Get all documents from local collection
        const localCollection = localDb.collection(collectionName);
        const documents = await localCollection.find({}).toArray();
        
        console.log(`   📊 Found ${documents.length} documents`);
        
        if (documents.length > 0) {
          // Insert documents into Atlas
          const atlasCollection = atlasDb.collection(collectionName);
          
          // Clear existing data in Atlas collection (optional - comment out if you want to keep existing data)
          await atlasCollection.deleteMany({});
          console.log(`   🗑️ Cleared existing data in Atlas`);
          
          // Insert new data
          const result = await atlasCollection.insertMany(documents);
          console.log(`   Migrated ${result.insertedCount} documents to Atlas`);
        } else {
          console.log(`   ⚠️ No documents to migrate`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
      }
      
      console.log('');
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update your .env files with the new Atlas connection string');
    console.log('2. Test your application with the Atlas database');
    console.log('3. Deploy to production\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connections
    if (localClient) {
      await localClient.close();
      console.log('🔌 Disconnected from Local MongoDB');
    }
    if (atlasClient) {
      await atlasClient.close();
      console.log('🔌 Disconnected from MongoDB Atlas');
    }
  }
}

// Verification function
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');
  
  try {
    const atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    
    const atlasDb = atlasClient.db('threat-advisory');
    const collections = await atlasDb.listCollections().toArray();
    
    console.log(`Atlas database has ${collections.length} collections:`);
    
    for (const collectionInfo of collections) {
      const collection = atlasDb.collection(collectionInfo.name);
      const count = await collection.countDocuments();
      console.log(`   📦 ${collectionInfo.name}: ${count} documents`);
    }
    
    await atlasClient.close();
    console.log('\nVerification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Main execution
async function main() {
  console.log('🌟 MongoDB Migration Tool - Local to Atlas\n');
  console.log('Local URI:', LOCAL_URI);
  console.log('Atlas URI:', ATLAS_URI.replace(/:[^:]*@/, ':****@')); // Hide password in logs
  console.log('');
  
  await migrateData();
  await verifyMigration();
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateData, verifyMigration };
