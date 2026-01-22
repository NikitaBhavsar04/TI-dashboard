// Simple test to check and send email with patch details
const { MongoClient } = require('mongodb');

async function testEmailWithPatchDetails() {
  try {
    // Connect to your database
    const client = new MongoClient('mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority');
    await client.connect();
    
    const db = client.db('threat-advisory');
    const advisories = db.collection('advisories');
    
    // Get the most recent advisory
    let advisory = await advisories.findOne({}, { sort: { createdAt: -1 } });
    
    if (!advisory) {
      console.log('No advisory found');
      return;
    }
    
    console.log('Found advisory:', advisory.title);
    console.log('Has patchDetails:', !!advisory.patchDetails, '- Count:', advisory.patchDetails?.length || 0);
    
    // If no patch details, add some
    if (!advisory.patchDetails || advisory.patchDetails.length === 0) {
      console.log('Adding patch details to advisory...');
      
      const patchDetails = [
        'Download and install security update KB5042421 from Microsoft Update Catalog',
        'Apply patches during scheduled maintenance window with proper backup procedures',
        'Verify patch installation using Windows Update verification tools',
        'Monitor systems for 48 hours post-patch for any performance issues',
        'Update security documentation to reflect new patch levels'
      ];
      
      await advisories.updateOne(
        { _id: advisory._id },
        { $set: { patchDetails: patchDetails } }
      );
      
      // Get updated advisory
      advisory = await advisories.findOne({ _id: advisory._id });
      console.log('Patch details added! Count:', advisory.patchDetails.length);
    }
    
    // Now send a test email with this advisory
    const { agenda } = require('./lib/agenda');
    
    console.log('Sending test email with patch details...');
    await agenda.now('send email', {
      recipients: ['mayank@forensiccybertech.com'], // Your email
      advisory: advisory,
      customMessage: 'Test email with patch details and metadata sections included'
    });
    
    console.log('Test email sent with patch details!');
    
    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEmailWithPatchDetails();
