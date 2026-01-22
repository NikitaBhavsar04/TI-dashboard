const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.atlas' });

// Import your models
const Advisory = require('./models/Advisory');

async function testApplicationWithAtlas() {
  console.log('🧪 Testing Application with MongoDB Atlas...\n');
  
  try {
    // Connect using your application's connection logic
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Atlas using application logic');
    
    // Test fetching advisories (your main data)
    console.log('\n📋 Testing Advisory data:');
    const advisories = await Advisory.find().limit(5);
    console.log(`Found ${advisories.length} advisories`);
    
    if (advisories.length > 0) {
      const firstAdvisory = advisories[0];
      console.log(' Sample advisory:');
      console.log(`   Title: ${firstAdvisory.title}`);
      console.log(`   Severity: ${firstAdvisory.severity}`);
      console.log(`   Published: ${firstAdvisory.publishedDate}`);
      console.log(`   Affected Products: ${firstAdvisory.affectedProducts?.join(', ') || 'None'}`);
    }
    
    // Test user data
    const User = require('./models/User');
    const users = await User.find();
    console.log(`\n👥 Found ${users.length} users`);
    
    // Test scheduled emails
    const ScheduledEmail = require('./models/ScheduledEmail');
    const emails = await ScheduledEmail.find();
    console.log(`📧 Found ${emails.length} scheduled emails`);
    
    await mongoose.disconnect();
    console.log('\n🎉 All tests passed! Your application works with Atlas.');
    console.log('\n📝 You can now:');
    console.log('1. Replace your .env file with .env.atlas');
    console.log('2. Restart your development server');
    console.log('3. Deploy to AWS with Atlas connection');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('💡 Check your connection string and network access in Atlas');
  }
}

testApplicationWithAtlas();
