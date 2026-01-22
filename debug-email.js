// Debug the email content issue
require('dotenv').config();

const mongoose = require('mongoose');

// Define schemas
const ScheduledEmailSchema = new mongoose.Schema({
  advisoryId: { type: String, required: true, ref: 'Advisory' },
  to: [{ type: String, required: true, trim: true }],
  cc: [{ type: String, trim: true }],
  bcc: [{ type: String, trim: true }],
  subject: { type: String, required: true, trim: true },
  customMessage: { type: String, trim: true },
  scheduledDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 }
});

const AdvisorySchema = new mongoose.Schema({
  title: String,
  description: String,
  severity: String,
  category: String,
  author: String,
  publishedDate: Date,
  affectedSystems: [String],
  recommendations: [String],
  iocs: [String]
});

const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
const Advisory = mongoose.models.Advisory || mongoose.model('Advisory', AdvisorySchema);

const debugEmail = async () => {
  console.log('🔍 Debugging email content generation...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('Connected to MongoDB');

    // Find the most recent sent email
    const recentEmail = await ScheduledEmail.findOne().sort({ createdAt: -1 });
    if (!recentEmail) {
      console.log('❌ No emails found');
      process.exit(1);
    }

    console.log(`📧 Found email:`);
    console.log(`   To: ${recentEmail.to.join(', ')}`);
    console.log(`   Subject: ${recentEmail.subject}`);
    console.log(`   Status: ${recentEmail.status}`);
    console.log(`   Advisory ID: ${recentEmail.advisoryId}`);
    console.log(`   Custom Message: ${recentEmail.customMessage || 'None'}`);

    // Try to find the advisory
    console.log(`\n🔍 Looking for advisory: ${recentEmail.advisoryId}`);
    const advisory = await Advisory.findById(recentEmail.advisoryId);
    
    if (advisory) {
      console.log(`Advisory found:`);
      console.log(`   Title: ${advisory.title}`);
      console.log(`   Severity: ${advisory.severity}`);
      console.log(`   Category: ${advisory.category}`);
      console.log(`   Description: ${advisory.description.substring(0, 100)}...`);
      console.log(`   Affected Systems: ${advisory.affectedSystems ? advisory.affectedSystems.length : 0}`);
      console.log(`   Recommendations: ${advisory.recommendations ? advisory.recommendations.length : 0}`);
      console.log(`   IOCs: ${advisory.iocs ? advisory.iocs.length : 0}`);
    } else {
      console.log(`❌ Advisory not found!`);
      
      // List all advisories to see what's available
      const allAdvisories = await Advisory.find({}, { _id: 1, title: 1 }).limit(5);
      console.log(`\n📋 Available advisories (first 5):`);
      allAdvisories.forEach((adv, index) => {
        console.log(`   ${index + 1}. ${adv._id} - ${adv.title}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};

debugEmail();
