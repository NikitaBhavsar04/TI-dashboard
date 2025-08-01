// Database diagnostic script
require('dotenv').config();
const mongoose = require('mongoose');

const checkDatabase = async () => {
  console.log('🔍 Checking database configuration...');
  console.log('Environment variables:');
  console.log(`MONGODB_URI: ${process.env.MONGODB_URI}`);
  console.log('');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');
    
    // Get database info
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📊 Database name: ${dbName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections found (${collections.length}):`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check each relevant collection
    console.log('\n📊 Collection counts:');
    
    if (collections.some(col => col.name === 'emails')) {
      const emailCount = await db.collection('emails').countDocuments();
      console.log(`  emails: ${emailCount} documents`);
      
      if (emailCount > 0) {
        const recentEmails = await db.collection('emails').find({}).sort({ createdAt: -1 }).limit(3).toArray();
        console.log('\n  Recent emails:');
        recentEmails.forEach((email, index) => {
          console.log(`    ${index + 1}. ${email.to} - ${email.subject} (${email.status})`);
        });
      }
    }
    
    if (collections.some(col => col.name === 'scheduledemails')) {
      const schedCount = await db.collection('scheduledemails').countDocuments();
      console.log(`  scheduledemails: ${schedCount} documents`);
    }
    
    if (collections.some(col => col.name === 'agendaJobs')) {
      const jobCount = await db.collection('agendaJobs').countDocuments();
      console.log(`  agendaJobs: ${jobCount} documents`);
      
      if (jobCount > 0) {
        const jobs = await db.collection('agendaJobs').find({}).limit(5).toArray();
        console.log('\n  Recent Agenda jobs:');
        jobs.forEach((job, index) => {
          console.log(`    ${index + 1}. ${job.name} - Next run: ${job.nextRunAt}`);
        });
      }
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
};

checkDatabase();
