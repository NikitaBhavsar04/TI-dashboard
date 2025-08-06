require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkRecentEmails() {
  const client = await MongoClient.connect('mongodb://localhost:27017/threat-advisory');
  const db = client.db();
  
  const emails = await db.collection('scheduledemails').find({}).sort({createdAt: -1}).limit(3).toArray();
  
  console.log('Recent scheduled emails:');
  emails.forEach((email, i) => {
    console.log(`${i+1}. Status: ${email.status}, To: ${email.to[0]}, Subject: ${email.subject.substring(0,50)}`);
  });
  
  await client.close();
}

checkRecentEmails();
