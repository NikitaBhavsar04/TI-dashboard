// Test what URL the tracking pixel will use
require('dotenv').config();

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';

console.log(' Environment Variables:');
console.log('   NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('   Final baseUrl:', baseUrl);

const testTrackingId = 'test-tracking-id-12345';
const trackingPixelUrl = `${baseUrl}/api/emails/tracking?t=${testTrackingId}&type=open`;

console.log('\n📧 Email Tracking Pixel URL:');
console.log('   ', trackingPixelUrl);

console.log('\n🧪 Testing if URL is accessible:');
console.log('   Try opening this URL in your browser:');
console.log('   ', trackingPixelUrl);
console.log('\n   This should return a 1x1 pixel image if the tracking endpoint works.');
