// Database Migration and Setup Script
// File: scripts/setup-email-tracking.js

const mongoose = require('mongoose');
const { EmailTracking, TrackingEvent } = require('../models/EmailTracking');
require('dotenv').config();

/**
 * Create index safely, ignoring if it already exists
 */
async function createIndexSafely(collection, indexSpec, options = {}) {
  try {
    await collection.createIndex(indexSpec, options);
  } catch (error) {
    if (error.code === 85) { // IndexOptionsConflict
      console.log(`   ⚠️  Index already exists: ${JSON.stringify(indexSpec)}`);
    } else {
      throw error;
    }
  }
}

/**
 * Create TTL index safely, handling existing indexes
 */
async function createTTLIndexSafely(collection, indexSpec, expireAfterSeconds) {
  try {
    // First, try to create the index
    await collection.createIndex(indexSpec, { expireAfterSeconds });
  } catch (error) {
    if (error.code === 85) { // IndexOptionsConflict
      console.log(`   ⚠️  TTL index already exists, checking if update is needed...`);
      
      // Get existing indexes
      const indexes = await collection.listIndexes().toArray();
      const indexName = Object.keys(indexSpec).join('_') + '_1';
      const existingIndex = indexes.find(idx => idx.name === indexName);
      
      if (existingIndex && existingIndex.expireAfterSeconds !== expireAfterSeconds) {
        console.log(`   🔄 Updating TTL index from ${existingIndex.expireAfterSeconds}s to ${expireAfterSeconds}s`);
        await collection.dropIndex(indexName);
        await collection.createIndex(indexSpec, { expireAfterSeconds });
        console.log(`   ✅ TTL index updated`);
      } else {
        console.log(`   ✅ TTL index is already correct`);
      }
    } else {
      throw error;
    }
  }
}

async function setupEmailTracking() {
  try {
    console.log('🚀 Setting up Email Tracking System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create indexes for performance
    console.log('📊 Creating database indexes...');
    
    try {
      // EmailTracking indexes
      await createIndexSafely(EmailTracking.collection, { trackingId: 1 }, { unique: true });
      await createIndexSafely(EmailTracking.collection, { recipientEmail: 1, createdAt: -1 });
      await createIndexSafely(EmailTracking.collection, { emailId: 1 });
      await createIndexSafely(EmailTracking.collection, { campaignId: 1, createdAt: -1 });
      await createIndexSafely(EmailTracking.collection, { 'metrics.openCount': -1 });
      await createIndexSafely(EmailTracking.collection, { createdAt: -1 });
      await createIndexSafely(EmailTracking.collection, { expiresAt: 1 }, { expireAfterSeconds: 0 });
      
      // TrackingEvent indexes
      await createIndexSafely(TrackingEvent.collection, { trackingId: 1, timestamp: -1 });
      await createIndexSafely(TrackingEvent.collection, { eventType: 1, timestamp: -1 });
      await createIndexSafely(TrackingEvent.collection, { eventHash: 1 }, { sparse: true });
      
      // Handle TTL index specially
      await createTTLIndexSafely(TrackingEvent.collection, { timestamp: 1 }, 7776000); // 90 days

      console.log('✅ Database indexes created successfully');
    } catch (indexError) {
      console.log('⚠️  Some indexes may already exist, continuing...');
    }

    // Create sample tracking data for testing
    console.log('📝 Creating sample tracking data...');
    
    const sampleTracking = [
      {
        trackingId: 'et_sample001_' + Date.now().toString(36),
        emailId: 'sample_advisory_1',
        recipientEmail: 'test1@example.com',
        senderEmail: 'noreply@inteldesk.com',
        subject: 'Critical Security Advisory - Sample 1',
        campaignId: 'sample_campaign_001',
        trackingConfig: {
          trackOpens: true,
          trackClicks: true,
          trackLocation: false,
          trackDevice: true
        },
        metrics: {
          openCount: 3,
          clickCount: 1,
          uniqueOpens: 2,
          uniqueClicks: 1,
          firstOpenAt: new Date(Date.now() - 3600000), // 1 hour ago
          lastOpenAt: new Date(Date.now() - 1800000),  // 30 minutes ago
          firstClickAt: new Date(Date.now() - 1800000),
          lastClickAt: new Date(Date.now() - 1800000)
        },
        status: 'active'
      },
      {
        trackingId: 'et_sample002_' + Date.now().toString(36),
        emailId: 'sample_advisory_2',
        recipientEmail: 'test2@example.com',
        senderEmail: 'noreply@inteldesk.com',
        subject: 'High Priority Security Advisory - Sample 2',
        campaignId: 'sample_campaign_001',
        trackingConfig: {
          trackOpens: true,
          trackClicks: true,
          trackLocation: false,
          trackDevice: true
        },
        metrics: {
          openCount: 1,
          clickCount: 0,
          uniqueOpens: 1,
          uniqueClicks: 0,
          firstOpenAt: new Date(Date.now() - 7200000), // 2 hours ago
          lastOpenAt: new Date(Date.now() - 7200000)
        },
        status: 'active'
      }
    ];

    // Insert sample tracking records
    for (const sample of sampleTracking) {
      const existing = await EmailTracking.findOne({ trackingId: sample.trackingId });
      if (!existing) {
        await EmailTracking.create(sample);
        console.log(`  📧 Created sample tracking: ${sample.trackingId}`);

        // Create sample events for first tracking record
        if (sample.trackingId.includes('sample001')) {
          const sampleEvents = [
            {
              trackingId: sample.trackingId,
              eventType: 'open',
              timestamp: new Date(Date.now() - 3600000),
              ipAddress: '203.0.113.1',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              device: {
                type: 'desktop',
                os: 'Windows',
                browser: 'Chrome',
                version: '91.0'
              },
              eventHash: 'hash_open_001'
            },
            {
              trackingId: sample.trackingId,
              eventType: 'open',
              timestamp: new Date(Date.now() - 1800000),
              ipAddress: '203.0.113.1',
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
              device: {
                type: 'mobile',
                os: 'iOS',
                browser: 'Safari',
                version: '14.6'
              }
            },
            {
              trackingId: sample.trackingId,
              eventType: 'click',
              timestamp: new Date(Date.now() - 1800000),
              ipAddress: '203.0.113.1',
              userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
              linkUrl: 'https://example.com/advisory/details',
              linkId: 'main_cta',
              device: {
                type: 'mobile',
                os: 'iOS',
                browser: 'Safari',
                version: '14.6'
              }
            }
          ];

          for (const event of sampleEvents) {
            await TrackingEvent.create(event);
            console.log(`    📊 Created sample event: ${event.eventType}`);
          }
        }
      }
    }

    // Verify setup
    const trackingCount = await EmailTracking.countDocuments();
    const eventCount = await TrackingEvent.countDocuments();
    
    console.log('\n📈 Email Tracking System Setup Complete!');
    console.log(`   📧 Tracking Records: ${trackingCount}`);
    console.log(`   📊 Tracking Events: ${eventCount}`);
    console.log('\n🔗 API Endpoints Available:');
    console.log('   GET  /api/tracking/analytics - Get tracking analytics');
    console.log('   GET  /api/tracking/[trackingId] - Get specific email tracking details');
    console.log('   GET  /api/track/pixel?t=[trackingId] - Tracking pixel endpoint');
    console.log('   GET  /api/track/link?t=[trackingId]&u=[url] - Link tracking endpoint');
    console.log('   POST /api/emails/send-advisory-enhanced - Send tracked emails');

    console.log('\n✨ System is ready for email tracking!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Cleanup script for old tracking data
async function cleanupTrackingData() {
  try {
    console.log('🧹 Cleaning up old tracking data...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete tracking records older than 90 days
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const deletedTracking = await EmailTracking.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    const deletedEvents = await TrackingEvent.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    console.log(`🗑️  Deleted ${deletedTracking.deletedCount} old tracking records`);
    console.log(`🗑️  Deleted ${deletedEvents.deletedCount} old tracking events`);

    // Update expired tracking records
    const expiredCount = await EmailTracking.updateMany(
      { expiresAt: { $lt: new Date() } },
      { status: 'expired' }
    );

    console.log(`⏰ Marked ${expiredCount.modifiedCount} tracking records as expired`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Export functions
module.exports = {
  setupEmailTracking,
  cleanupTrackingData
};

// Run setup if this file is executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'cleanup') {
    cleanupTrackingData();
  } else {
    setupEmailTracking();
  }
}
