// Create sample tracking data for testing analytics
const mongoose = require('mongoose');
require('dotenv').config();

async function createTestTrackingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');
    
    const testTrackingData = [
      {
        emailId: 'test-advisory-001',
        recipientEmail: 'superadmin@inteldesk.com',
        trackingId: 'track-001-' + Date.now(),
        events: [
          {
            type: 'open',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            device: {
              type: 'desktop',
              os: 'Windows',
              browser: 'Chrome'
            }
          },
          {
            type: 'click',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            device: {
              type: 'desktop',
              os: 'Windows',
              browser: 'Chrome'
            },
            linkUrl: 'https://example.com/threat-details'
          }
        ],
        openCount: 3,
        lastOpened: new Date(),
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        trackingOptions: {
          enableTracking: true,
          trackOpens: true,
          trackClicks: true,
          trackLocation: true,
          trackDevice: true
        }
      },
      {
        emailId: 'test-advisory-002',
        recipientEmail: 'test@example.com',
        trackingId: 'track-002-' + Date.now(),
        events: [
          {
            type: 'open',
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            ipAddress: '10.0.0.50',
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
            device: {
              type: 'mobile',
              os: 'iOS',
              browser: 'Safari'
            }
          }
        ],
        openCount: 1,
        lastOpened: new Date(Date.now() - 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        trackingOptions: {
          enableTracking: true,
          trackOpens: true,
          trackClicks: false,
          trackLocation: true,
          trackDevice: true
        }
      },
      {
        emailId: 'test-advisory-003',
        recipientEmail: 'admin@company.com',
        trackingId: 'track-003-' + Date.now(),
        events: [],
        openCount: 0,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        trackingOptions: {
          enableTracking: true,
          trackOpens: true,
          trackClicks: true,
          trackLocation: true,
          trackDevice: true
        }
      }
    ];

    await trackingCollection.insertMany(testTrackingData);
    
    console.log(`Created ${testTrackingData.length} test tracking records`);
    console.log('📊 Now you can view analytics at: http://localhost:3000/analytics');
    console.log('');
    console.log('Test data includes:');
    console.log('- 1 email with multiple opens and clicks (desktop)');
    console.log('- 1 email with single open (mobile)');
    console.log('- 1 email with no opens (for comparison)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createTestTrackingData();
