// Check Agenda job status and pending emails
require('dotenv').config();

const mongoose = require('mongoose');

const checkAgendaStatus = async () => {
  console.log('🔍 Checking Agenda jobs and pending emails...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Check Agenda jobs collection
    const agendaJobs = await mongoose.connection.db.collection('agendaJobs').find({}).toArray();
    console.log(`\n📋 Found ${agendaJobs.length} Agenda jobs:`);
    
    agendaJobs.forEach((job, index) => {
      console.log(`${index + 1}. Name: ${job.name}`);
      console.log(`   Next run: ${job.nextRunAt ? new Date(job.nextRunAt).toLocaleString() : 'Not scheduled'}`);
      console.log(`   Last run: ${job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}`);
      console.log(`   Status: ${job.disabled ? 'DISABLED' : 'ENABLED'}`);
      console.log(`   Data: ${JSON.stringify(job.data)}`);
      console.log('');
    });

    // Check pending scheduled emails
    const ScheduledEmailSchema = new mongoose.Schema({
      advisoryId: String,
      to: [String],
      subject: String,
      scheduledDate: Date,
      status: String,
      createdAt: Date,
      sentAt: Date
    });
    
    const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
    
    const pendingEmails = await ScheduledEmail.find({ status: 'pending' }).sort({ scheduledDate: 1 });
    console.log(`\n📧 Found ${pendingEmails.length} pending emails:`);
    
    pendingEmails.forEach((email, index) => {
      console.log(`${index + 1}. ID: ${email._id}`);
      console.log(`   To: ${email.to.join(', ')}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Scheduled: ${email.scheduledDate.toLocaleString()}`);
      console.log(`   Advisory ID: ${email.advisoryId}`);
      console.log(`   Should have been sent: ${email.scheduledDate < new Date() ? 'YES - OVERDUE!' : 'No'}`);
      console.log('');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkAgendaStatus();
