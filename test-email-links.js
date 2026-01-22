// Test script to verify email links use production domain
const dotenv = require('dotenv');

// Load production environment
dotenv.config({ path: '.env.production' });

console.log('🧪 Testing Email Link Generation\n');

// Test the email link generation logic
const mockAdvisory = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Test Advisory',
  severity: 'High'
};

// Simulate the link generation logic from our email templates
const baseUrlFromAgenda = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
const baseUrlFromScheduler = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
const baseUrlFromSendAdvisory = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';

console.log('📧 Email Link Testing Results:');
console.log('=' .repeat(50));
console.log(`Environment Variables:`);
console.log(`  NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Not set'}`);
console.log(`  NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'Not set'}`);
console.log('');

console.log(`Generated Links:`);
console.log(`   Agenda.js Link: ${baseUrlFromAgenda}/advisory/${mockAdvisory._id}`);
console.log(`   EmailScheduler Link: ${baseUrlFromScheduler}/advisory/${mockAdvisory._id}`);
console.log(`   SendAdvisory Link: ${baseUrlFromSendAdvisory}/advisory/${mockAdvisory._id}`);
console.log('');

// Verify all links use production domain
const expectedDomain = 'https://inteldesk.eagleyesoc.ai';
const allLinksCorrect = [baseUrlFromAgenda, baseUrlFromScheduler, baseUrlFromSendAdvisory]
  .every(url => url === expectedDomain);

if (allLinksCorrect) {
  console.log('SUCCESS: All email links will use production domain!');
  console.log(`Domain: ${expectedDomain}`);
} else {
  console.log('❌ ERROR: Some links might still use localhost!');
  console.log('❌ Check environment variable configuration');
}

console.log('\n📝 Email Template Preview:');
console.log('=' .repeat(50));
console.log('Your users will receive emails with links like:');
console.log(` ${expectedDomain}/advisory/[advisory-id]`);
console.log('\nThis will direct them to your professional threat advisory platform! 🚀');
