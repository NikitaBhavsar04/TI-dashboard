// Clear old agenda jobs from MongoDB
require('dotenv').config();
const mongoose = require('mongoose');

const clearAgendaJobs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');
    
    // Clear failed agenda jobs with the old error
    const agendaCollection = mongoose.connection.db.collection('agendaJobs');
    
    const failedJobs = await agendaCollection.find({
      failReason: 'nodemailer.createTransporter is not a function'
    }).toArray();
    
    console.log(`Found ${failedJobs.length} failed jobs with old error`);
    
    if (failedJobs.length > 0) {
      const result = await agendaCollection.deleteMany({
        failReason: 'nodemailer.createTransporter is not a function'
      });
      console.log(`Deleted ${result.deletedCount} old failed jobs`);
    }
    
    // Clear all agenda jobs to start fresh
    const allJobsCount = await agendaCollection.countDocuments({});
    console.log(`Total agenda jobs before clearing: ${allJobsCount}`);
    
    const clearAll = await agendaCollection.deleteMany({});
    console.log(`Cleared all ${clearAll.deletedCount} agenda jobs for fresh start`);
    
    await mongoose.disconnect();
    console.log('Cleanup complete - agenda jobs cleared');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
};

clearAgendaJobs();
