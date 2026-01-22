require('dotenv').config();
const mongoose = require('mongoose');

const ScheduledEmailSchema = new mongoose.Schema({}, { strict: false, collection: 'scheduledemails' });
const ScheduledEmail = mongoose.model('ScheduledEmail', ScheduledEmailSchema);

async function checkScheduledEmails() {
  try {
    console.log('📧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const emails = await ScheduledEmail.find().sort({ createdAt: -1 }).limit(20).lean();
    
    console.log(`📊 Total scheduled emails found: ${emails.length}\n`);
    
    if (emails.length === 0) {
      console.log('❌ No scheduled emails found in database');
    } else {
      console.log('📧 Scheduled emails:');
      emails.forEach((email, index) => {
        console.log(`\n${index + 1}. Email ID: ${email._id}`);
        console.log(`   Advisory ID: ${email.advisoryId}`);
        console.log(`   Status: ${email.status}`);
        console.log(`   To: ${email.to ? email.to.join(', ') : 'N/A'}`);
        console.log(`   Subject: ${email.subject || 'N/A'}`);
        console.log(`   Scheduled: ${email.scheduledDate}`);
        console.log(`   Created: ${email.createdAt}`);
      });
    }

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkScheduledEmails();
