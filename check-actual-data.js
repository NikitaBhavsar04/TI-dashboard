// Check the actual email that was sent
const { MongoClient } = require('mongodb');

async function checkSentEmail() {
  try {
    // Use the Atlas connection string from your env
    const client = new MongoClient('mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority');
    await client.connect();
    
    const db = client.db('threat-advisory');
    
    // Check scheduled emails
    const scheduledEmails = await db.collection('scheduledemails').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log('=== RECENT SCHEDULED EMAILS ===');
    scheduledEmails.forEach((email, index) => {
      console.log(`${index + 1}. Subject: ${email.subject}`);
      console.log(`   Status: ${email.status}`);
      console.log(`   Sent At: ${email.sentAt || 'Not sent'}`);
      console.log(`   Recipients: ${email.recipients?.length || 0}`);
      console.log('---');
    });
    
    // Check the most recent advisory
    const advisory = await db.collection('advisories').findOne({}, { sort: { createdAt: -1 } });
    
    console.log('\n=== MOST RECENT ADVISORY ===');
    console.log('Title:', advisory?.title);
    console.log('Has patchDetails:', !!advisory?.patchDetails, '(Count:', advisory?.patchDetails?.length || 0, ')');
    console.log('Has mitreTactics:', !!advisory?.mitreTactics, '(Count:', advisory?.mitreTactics?.length || 0, ')');
    console.log('Has recommendations:', !!advisory?.recommendations, '(Count:', advisory?.recommendations?.length || 0, ')');
    console.log('TLP:', advisory?.tlp || 'Not set');
    
    if (advisory?.patchDetails?.length > 0) {
      console.log('\nSample patch detail:', advisory.patchDetails[0]);
    } else {
      console.log('\n🚨 NO PATCH DETAILS - This explains why patch section is missing!');
    }
    
    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSentEmail();
