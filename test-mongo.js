const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = 'mongodb://localhost:27017/threat-advisory';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    
    // List databases
    const dbs = await client.db().admin().listDatabases();
    console.log('📊 Available databases:');
    dbs.databases.forEach(db => console.log(`  - ${db.name}`));
    
    // Check if threat-advisory database exists
    const db = client.db('threat-advisory');
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections in threat-advisory database:');
    if (collections.length === 0) {
      console.log('  - No collections found (database is empty)');
    } else {
      collections.forEach(col => console.log(`  - ${col.name}`));
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();
