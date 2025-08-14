// Script to fix the MongoDB index issue
const mongoose = require('mongoose');

async function fixClientIndexes() {
  try {
    // Use existing mongoose connection
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB via Mongoose');

    const db = mongoose.connection.db;
    const collection = db.collection('clients');

    // List existing indexes
    const indexes = await collection.indexes();
    console.log('Existing indexes:', indexes.map(idx => idx.name));

    // Drop the problematic index if it exists
    try {
      await collection.dropIndex('name_text_emails_1');
      console.log('Dropped problematic text index: name_text_emails_1');
    } catch (error) {
      console.log('Problematic index not found or already dropped');
    }

    // Try to drop any other text indexes that might be problematic
    try {
      const textIndexes = indexes.filter(idx => idx.key && Object.values(idx.key).includes('text'));
      for (const textIndex of textIndexes) {
        if (textIndex.name !== '_id_') {
          try {
            await collection.dropIndex(textIndex.name);
            console.log('Dropped text index:', textIndex.name);
          } catch (err) {
            console.log('Could not drop index:', textIndex.name);
          }
        }
      }
    } catch (error) {
      console.log('Error checking text indexes:', error.message);
    }

    // Create new safe indexes
    try {
      await collection.createIndex({ name: 'text' });
      console.log('Created text index on name field');
    } catch (error) {
      console.log('Text index on name might already exist');
    }

    try {
      await collection.createIndex({ emails: 1 });
      console.log('Created index on emails field');
    } catch (error) {
      console.log('Index on emails might already exist');
    }

    try {
      await collection.createIndex({ isActive: 1 });
      console.log('Created index on isActive field');
    } catch (error) {
      console.log('Index on isActive might already exist');
    }

    // List indexes after fix
    const newIndexes = await collection.indexes();
    console.log('New indexes:', newIndexes.map(idx => idx.name));

    console.log('Index fix completed successfully!');

  } catch (error) {
    console.error('Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixClientIndexes();
