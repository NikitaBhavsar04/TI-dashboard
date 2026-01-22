// Debug tracking database connections
const mongoose = require('mongoose');
require('dotenv').config();

async function debugTrackingConnections() {
  try {
    console.log('🔍 Debugging tracking database connections...\n');

    // Method 1: Using direct mongoose connection (like check-tracking.js)
    console.log('1️⃣ Method 1: Direct mongoose connection');
    console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'Present' : 'Missing');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   Connected via direct mongoose.connect()');
    
    const db1 = mongoose.connection.db;
    const collection1 = db1.collection('emailTracking');
    const count1 = await collection1.countDocuments();
    console.log(`   📊 Records found: ${count1}`);
    
    const recent1 = await collection1.find({}).sort({ createdAt: -1 }).limit(3).toArray();
    console.log('   📧 Recent records:');
    recent1.forEach((record, index) => {
      console.log(`      ${index + 1}. ${record.recipientEmail} (${record.trackingId})`);
    });
    
    await mongoose.disconnect();
    console.log('   Disconnected\n');

    // Method 2: Using fresh connection (like email sending)
    console.log('2️⃣ Method 2: Using fresh connection');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   Connected via fresh mongoose.connect()');
    
    const db2 = mongoose.connection.db;
    const collection2 = db2.collection('emailTracking');
    const count2 = await collection2.countDocuments();
    console.log(`   📊 Records found: ${count2}`);
    
    const recent2 = await collection2.find({}).sort({ createdAt: -1 }).limit(3).toArray();
    console.log('   📧 Recent records:');
    recent2.forEach((record, index) => {
      console.log(`      ${index + 1}. ${record.recipientEmail} (${record.trackingId})`);
    });

    // Method 3: Check connection details
    console.log('\n3️⃣ Connection Details:');
    console.log('   Database Name:', mongoose.connection.db.databaseName);
    console.log('   Connection State:', mongoose.connection.readyState);
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);

    // Method 4: List all collections
    console.log('\n4️⃣ All Collections:');
    const collections = await db2.listCollections().toArray();
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    await mongoose.disconnect();
    console.log('\nDebugging completed');

  } catch (error) {
    console.error('❌ Error debugging connections:', error);
  }
}

debugTrackingConnections();
