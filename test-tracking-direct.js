// Direct Email Tracking Test
// File: test-tracking-direct.js

const EmailTrackingService = require('./lib/emailTrackingService');
const EnhancedEmailTemplateGenerator = require('./lib/enhancedEmailTemplateGenerator');
const mongoose = require('mongoose');
require('dotenv').config();

async function testTrackingDirect() {
  try {
    console.log('🧪 Testing Email Tracking Direct Integration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const trackingService = new EmailTrackingService(mongoose.connection);
    const templateGenerator = new EnhancedEmailTemplateGenerator(trackingService);

    // Test 1: Initialize tracking
    console.log('\n1️⃣ Testing tracking initialization...');
    const testTracking = await trackingService.initializeTracking({
      emailId: 'test_direct_advisory',
      recipientEmail: 'test@example.com',
      senderEmail: 'noreply@inteldesk.com',
      subject: 'Direct Test Security Advisory',
      campaignId: 'direct_test_campaign',
      trackingConfig: {
        trackOpens: true,
        trackClicks: true,
        trackDevice: true
      }
    });

    console.log(`   Tracking ID: ${testTracking.trackingId}`);
    console.log(`   📸 Pixel URL: ${testTracking.pixelUrl}`);

    // Test 2: Generate email with tracking
    console.log('\n2️⃣ Testing email template generation...');
    
    const sampleAdvisory = {
      _id: 'direct_test_advisory_id',
      title: 'Test Direct Integration Advisory',
      threatLevel: 'high',
      advisoryId: 'ADV-DIRECT-2025-001',
      executiveSummary: 'Testing direct integration of email tracking system.',
      affectedProducts: [
        { name: 'Test System', version: '2.0.0', description: 'Direct integration test' }
      ],
      impactAssessment: 'Medium impact - testing purposes',
      recommendations: [
        'Verify tracking functionality',
        'Test pixel loading',
        'Validate click tracking'
      ],
      technicalDetails: 'Direct integration test for email tracking system',
      references: [
        { url: 'https://example.com/test1', title: 'Test Reference 1' },
        { url: 'https://example.com/test2', title: 'Test Reference 2' }
      ],
      createdAt: new Date()
    };

    const trackedEmail = await templateGenerator.generateTrackedThreatAdvisory({
      advisory: sampleAdvisory,
      recipient: { email: 'test@example.com' },
      sender: { email: 'noreply@inteldesk.com' },
      customMessage: 'This is a direct integration test email.',
      campaignId: 'direct_test_campaign',
      trackingConfig: {
        trackOpens: true,
        trackClicks: true,
        trackDevice: true
      }
    });

    console.log(`   Generated tracked email`);
    console.log(`   📧 HTML length: ${trackedEmail.html.length} characters`);
    console.log(`   🆔 Tracking ID: ${trackedEmail.trackingId}`);
    console.log(`   📸 Contains pixel: ${trackedEmail.html.includes('api/track/pixel') ? '✅' : '❌'}`);
    console.log(`    Contains tracked links: ${trackedEmail.html.includes('api/track/link') ? '✅' : '❌'}`);

    // Test 3: Simulate tracking events
    console.log('\n3️⃣ Testing event simulation...');
    
    // Simulate email open
    await trackingService.logEvent({
      trackingId: trackedEmail.trackingId,
      eventType: 'open',
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referer: 'https://mail.outlook.com'
    });
    console.log(`   📖 Logged email open event`);

    // Simulate link click
    await trackingService.logEvent({
      trackingId: trackedEmail.trackingId,
      eventType: 'click',
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      linkUrl: 'https://example.com/test1',
      linkId: 'reference_link_1'
    });
    console.log(`   🖱️  Logged link click event`);

    // Test 4: Get analytics
    console.log('\n4️⃣ Testing analytics retrieval...');
    const analytics = await trackingService.getAnalytics({
      trackingId: trackedEmail.trackingId
    });

    console.log(`   📊 Total emails: ${analytics.statistics.totalEmails}`);
    console.log(`   👀 Total opens: ${analytics.statistics.totalOpens}`);
    console.log(`   🖱️  Total clicks: ${analytics.statistics.totalClicks}`);
    console.log(`   📈 Open rate: ${analytics.statistics.openRate}%`);
    console.log(`   Click rate: ${analytics.statistics.clickRate}%`);

    // Test 5: URL extraction from generated email
    console.log('\n5️⃣ Testing URL extraction...');
    
    // Extract pixel URL
    const pixelMatch = trackedEmail.html.match(/src="([^"]*api\/track\/pixel[^"]*)"/);
    if (pixelMatch) {
      console.log(`   📸 Pixel URL: ${pixelMatch[1]}`);
    }

    // Extract tracked links
    const linkMatches = trackedEmail.html.match(/href="([^"]*api\/track\/link[^"]*)"/g);
    if (linkMatches) {
      console.log(`    Found ${linkMatches.length} tracked links:`);
      linkMatches.slice(0, 3).forEach((match, index) => {
        const url = match.match(/href="([^"]*)"/)[1];
        console.log(`      ${index + 1}. ${url.substring(0, 100)}...`);
      });
    }

    // Test 6: Validate URLs are using production domain
    console.log('\n6️⃣ Testing URL domain validation...');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'localhost';
    console.log(`   🌐 Base URL: ${baseUrl}`);
    
    if (baseUrl.includes('localhost')) {
      console.log(`   ⚠️  WARNING: Using localhost - external tracking won't work`);
    } else {
      console.log(`   Production domain configured`);
    }

    console.log('\n🎉 Direct integration test completed successfully!');

    // Cleanup
    const { EmailTracking, TrackingEvent } = require('./models/EmailTracking');
    await EmailTracking.deleteMany({ trackingId: testTracking.trackingId });
    await EmailTracking.deleteMany({ trackingId: trackedEmail.trackingId });
    await TrackingEvent.deleteMany({ trackingId: testTracking.trackingId });
    await TrackingEvent.deleteMany({ trackingId: trackedEmail.trackingId });
    console.log('🗑️  Cleanup completed');

  } catch (error) {
    console.error('❌ Direct integration test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  testTrackingDirect();
}

module.exports = { testTrackingDirect };
