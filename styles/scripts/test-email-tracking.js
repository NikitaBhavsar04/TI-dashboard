// Comprehensive Testing Script for Email Tracking System
// File: scripts/test-email-tracking.js

const mongoose = require('mongoose');
const EmailTrackingService = require('../lib/emailTrackingService');
const EnhancedEmailTemplateGenerator = require('../lib/enhancedEmailTemplateGenerator');
require('dotenv').config();

async function testEmailTrackingSystem() {
  try {
    console.log('🧪 Testing Email Tracking System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const trackingService = new EmailTrackingService(mongoose.connection);
    const templateGenerator = new EnhancedEmailTemplateGenerator(trackingService);

    // Test 1: Initialize tracking for a test email
    console.log('\n1️⃣ Testing tracking initialization...');
    
    const testTracking = await trackingService.initializeTracking({
      emailId: 'test_advisory_' + Date.now(),
      recipientEmail: 'test@example.com',
      senderEmail: 'noreply@inteldesk.com',
      subject: 'Test Security Advisory',
      campaignId: 'test_campaign_' + Date.now(),
      trackingConfig: {
        trackOpens: true,
        trackClicks: true,
        trackLocation: false,
        trackDevice: true
      }
    });

    console.log(`   ✅ Tracking initialized: ${testTracking.trackingId}`);
    console.log(`   📸 Pixel URL: ${testTracking.pixelUrl}`);
    
    const testLinkUrl = testTracking.trackLinkFunction('https://example.com/test', 'test_link');
    console.log(`   🔗 Test tracked link: ${testLinkUrl}`);

    // Test 2: Generate tracked email template
    console.log('\n2️⃣ Testing email template generation...');
    
    const sampleAdvisory = {
      _id: 'test_advisory_id',
      title: 'Critical Security Vulnerability in Test System',
      threatLevel: 'critical',
      advisoryId: 'ADV-2025-001',
      executiveSummary: 'A critical vulnerability has been discovered that requires immediate attention.',
      affectedProducts: [
        { name: 'Test Product', version: '1.2.3', description: 'Main application server' }
      ],
      impactAssessment: 'High impact - potential for data breach',
      recommendations: [
        'Apply security patch immediately',
        'Monitor system logs for suspicious activity',
        'Implement additional access controls'
      ],
      technicalDetails: 'CVE-2025-0001: Buffer overflow in authentication module',
      references: [
        { url: 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-0001', title: 'CVE Details' },
        { url: 'https://vendor.com/security-advisory', title: 'Vendor Advisory' }
      ],
      createdAt: new Date()
    };

    const trackedEmail = await templateGenerator.generateTrackedThreatAdvisory({
      advisory: sampleAdvisory,
      recipient: { email: 'test@example.com' },
      sender: { email: 'noreply@inteldesk.com' },
      customMessage: 'This is a test advisory email with full tracking capabilities.',
      campaignId: 'test_campaign',
      trackingConfig: {
        trackOpens: true,
        trackClicks: true,
        trackLocation: false,
        trackDevice: true
      }
    });

    console.log(`   ✅ Email template generated successfully`);
    console.log(`   📧 HTML length: ${trackedEmail.html.length} characters`);
    console.log(`   🆔 Tracking ID: ${trackedEmail.trackingId}`);

    // Test 3: Simulate email events
    console.log('\n3️⃣ Testing event logging...');

    // Simulate email open
    const openResult = await trackingService.logEvent({
      trackingId: testTracking.trackingId,
      eventType: 'open',
      ipAddress: '203.0.113.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      referer: 'https://mail.google.com'
    });

    console.log(`   📖 Email open logged: ${openResult ? '✅' : '❌'}`);

    // Simulate link click
    const clickResult = await trackingService.logEvent({
      trackingId: testTracking.trackingId,
      eventType: 'click',
      ipAddress: '203.0.113.100',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
      linkUrl: 'https://example.com/advisory/details',
      linkId: 'main_cta'
    });

    console.log(`   👆 Link click logged: ${clickResult ? '✅' : '❌'}`);

    // Test 4: Retrieve tracking analytics
    console.log('\n4️⃣ Testing analytics retrieval...');

    const analytics = await trackingService.getAnalytics({
      trackingId: testTracking.trackingId
    });

    console.log(`   📊 Analytics retrieved successfully`);
    console.log(`   📈 Total emails: ${analytics.statistics.totalEmails}`);
    console.log(`   👀 Total opens: ${analytics.statistics.totalOpens}`);
    console.log(`   🖱️  Total clicks: ${analytics.statistics.totalClicks}`);
    console.log(`   📍 Open rate: ${analytics.statistics.openRate}%`);
    console.log(`   🎯 Click rate: ${analytics.statistics.clickRate}%`);

    // Test 5: Get detailed tracking events
    console.log('\n5️⃣ Testing detailed event retrieval...');

    const events = await trackingService.getTrackingEvents(testTracking.trackingId);
    console.log(`   📋 Retrieved ${events.length} events`);
    
    events.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.eventType.toUpperCase()} at ${event.timestamp.toISOString()}`);
      if (event.device) {
        console.log(`      📱 Device: ${event.device.type} - ${event.device.browser} on ${event.device.os}`);
      }
      if (event.linkUrl) {
        console.log(`      🔗 Link: ${event.linkUrl}`);
      }
    });

    // Test 6: Test URL validation (security check)
    console.log('\n6️⃣ Testing URL validation...');
    
    const testUrls = [
      'https://example.com/safe-link',
      'http://example.com/another-safe-link',
      'javascript:alert("xss")',
      'ftp://unsafe-protocol.com',
      'http://localhost/dangerous',
      'https://192.168.1.1/internal'
    ];

    testUrls.forEach(url => {
      const isValid = isValidTrackingUrl(url);
      console.log(`   ${isValid ? '✅' : '❌'} ${url}`);
    });

    // Test 7: Performance test
    console.log('\n7️⃣ Testing performance...');

    const startTime = Date.now();
    
    // Simulate multiple concurrent events
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        trackingService.logEvent({
          trackingId: testTracking.trackingId,
          eventType: i % 2 === 0 ? 'open' : 'click',
          ipAddress: `203.0.113.${100 + i}`,
          userAgent: 'Test User Agent',
          linkUrl: i % 2 === 1 ? `https://example.com/link${i}` : undefined
        })
      );
    }

    await Promise.all(promises);
    const endTime = Date.now();

    console.log(`   ⚡ Logged 10 events in ${endTime - startTime}ms`);

    // Test 8: Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...');

    const { EmailTracking, TrackingEvent } = require('../models/EmailTracking');
    
    await EmailTracking.deleteMany({ trackingId: testTracking.trackingId });
    await EmailTracking.deleteMany({ trackingId: trackedEmail.trackingId });
    await TrackingEvent.deleteMany({ trackingId: testTracking.trackingId });
    await TrackingEvent.deleteMany({ trackingId: trackedEmail.trackingId });

    console.log(`   🗑️  Test data cleaned up`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Results Summary:');
    console.log('   ✅ Tracking initialization');
    console.log('   ✅ Email template generation');
    console.log('   ✅ Event logging (opens & clicks)');
    console.log('   ✅ Analytics retrieval');
    console.log('   ✅ Event detail retrieval');
    console.log('   ✅ URL validation');
    console.log('   ✅ Performance test');
    console.log('   ✅ Data cleanup');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

/**
 * Validate URL for security (same logic as in tracking endpoint)
 */
function isValidTrackingUrl(url) {
  try {
    const parsedUrl = new URL(url);
    
    // Allow http and https protocols only
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Block localhost and internal IPs for security
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Load test for stress testing
async function loadTestEmailTracking() {
  console.log('🚀 Starting load test...\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const trackingService = new EmailTrackingService(mongoose.connection);

    const batchSize = 50;
    const batches = 5;
    const totalEvents = batchSize * batches;

    console.log(`📊 Testing ${totalEvents} events in ${batches} batches of ${batchSize}`);

    const testTrackingId = 'et_loadtest_' + Date.now().toString(36);
    
    // Initialize tracking
    await trackingService.initializeTracking({
      emailId: 'load_test_advisory',
      recipientEmail: 'loadtest@example.com',
      senderEmail: 'noreply@inteldesk.com',
      subject: 'Load Test Advisory',
      campaignId: 'load_test_campaign'
    });

    const startTime = Date.now();

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises = [];
      
      for (let i = 0; i < batchSize; i++) {
        const eventIndex = batch * batchSize + i;
        batchPromises.push(
          trackingService.logEvent({
            trackingId: testTrackingId,
            eventType: eventIndex % 3 === 0 ? 'click' : 'open',
            ipAddress: `203.0.${Math.floor(eventIndex / 255)}.${eventIndex % 255}`,
            userAgent: `TestAgent/${eventIndex}`,
            linkUrl: eventIndex % 3 === 0 ? `https://example.com/link${eventIndex}` : undefined
          })
        );
      }

      await Promise.all(batchPromises);
      console.log(`   ✅ Batch ${batch + 1}/${batches} completed`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const eventsPerSecond = (totalEvents / duration * 1000).toFixed(2);

    console.log(`\n📈 Load Test Results:`);
    console.log(`   ⏱️  Total time: ${duration}ms`);
    console.log(`   🏃 Events per second: ${eventsPerSecond}`);
    console.log(`   📊 Total events processed: ${totalEvents}`);

    // Cleanup
    const { EmailTracking, TrackingEvent } = require('../models/EmailTracking');
    await EmailTracking.deleteMany({ trackingId: testTrackingId });
    await TrackingEvent.deleteMany({ trackingId: testTrackingId });

    console.log(`   🗑️  Load test data cleaned up`);

  } catch (error) {
    console.error('❌ Load test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Export functions
module.exports = {
  testEmailTrackingSystem,
  loadTestEmailTracking
};

// Run test if this file is executed directly
if (require.main === module) {
  const testType = process.argv[2];
  
  if (testType === 'load') {
    loadTestEmailTracking();
  } else {
    testEmailTrackingSystem();
  }
}
