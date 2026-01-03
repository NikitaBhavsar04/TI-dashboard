// Script to check the latest advisory data in MongoDB
const mongoose = require('mongoose');

// Connection URI - update with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory';

const advisorySchema = new mongoose.Schema({}, { strict: false, collection: 'advisories' });
const Advisory = mongoose.model('Advisory', advisorySchema);

async function checkLatestAdvisory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the latest advisory
    const latest = await Advisory.findOne().sort({ createdAt: -1 });

    if (!latest) {
      console.log('No advisories found in database');
      return;
    }

    console.log('\n=== LATEST ADVISORY DATA ===\n');
    console.log('ID:', latest._id);
    console.log('Advisory ID:', latest.advisoryId);
    console.log('Title:', latest.title);
    console.log('Full Title:', latest.fullTitle);
    console.log('Severity:', latest.severity);
    console.log('Criticality:', latest.criticality);
    console.log('Threat Type:', latest.threatType);
    console.log('Category:', latest.category);
    console.log('TLP:', latest.tlp);
    console.log('Vendor:', latest.vendor);
    console.log('Affected Product:', latest.affectedProduct);
    console.log('Affected Products:', latest.affectedProducts);
    console.log('Target Sectors:', latest.targetSectors);
    console.log('Regions:', latest.regions);
    console.log('CVE IDs:', latest.cveIds);
    console.log('MITRE Tactics:', latest.mitreTactics);
    console.log('Recommendations:', latest.recommendations);
    console.log('Patch Details:', latest.patchDetails);
    console.log('References:', latest.references);
    console.log('Published Date:', latest.publishedDate);
    console.log('Author:', latest.author);
    console.log('HTML File Name:', latest.htmlFileName);
    console.log('Created At:', latest.createdAt);
    console.log('\nExecutive Summary (first 200 chars):');
    console.log(latest.executiveSummary?.substring(0, 200) + '...');
    
    console.log('\n=== FIELD CHECK ===\n');
    const allFields = Object.keys(latest.toObject());
    console.log('All fields in document:', allFields);
    
    console.log('\n=== MISSING FIELDS ===\n');
    const expectedFields = [
      'advisoryId', 'fullTitle', 'criticality', 'threatType', 
      'affectedProduct', 'affectedProducts', 'vendor', 'tlp',
      'targetSectors', 'regions', 'cveIds', 'mitreTactics', 
      'recommendations', 'patchDetails'
    ];
    
    expectedFields.forEach(field => {
      const value = latest[field];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        console.log(`❌ ${field}: ${value === undefined ? 'undefined' : value === null ? 'null' : 'empty'}`);
      } else {
        console.log(`✓ ${field}:`, Array.isArray(value) ? `${value.length} items` : typeof value);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkLatestAdvisory();
