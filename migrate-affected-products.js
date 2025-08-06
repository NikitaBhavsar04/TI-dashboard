const { MongoClient } = require('mongodb');

async function migrateAffectedProducts() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('advisories');
    
    // Find all advisories with affectedProduct field
    const advisories = await collection.find({ affectedProduct: { $exists: true } }).toArray();
    console.log(`Found ${advisories.length} advisories with affectedProduct field`);
    
    for (const advisory of advisories) {
      if (advisory.affectedProduct && typeof advisory.affectedProduct === 'string') {
        // Convert single string to array and rename field
        await collection.updateOne(
          { _id: advisory._id },
          {
            $set: { affectedProducts: [advisory.affectedProduct] },
            $unset: { affectedProduct: "" }
          }
        );
        console.log(`Migrated advisory: ${advisory.title}`);
      }
    }
    
    console.log('Migration completed');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
if (require.main === module) {
  migrateAffectedProducts();
}

module.exports = migrateAffectedProducts;
