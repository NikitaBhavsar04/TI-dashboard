const { MongoClient } = require('mongodb');

async function checkAdvisoryStructure() {
  try {
    const client = new MongoClient('mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority');
    await client.connect();
    
    const db = client.db('threat-advisory');
    const advisories = db.collection('advisories');
    
    // Get a recent advisory
    const advisory = await advisories.findOne({}, { sort: { createdAt: -1 } });
    
    console.log('=== ADVISORY STRUCTURE ANALYSIS ===');
    console.log('Title:', advisory?.title || 'No title');
    console.log('Has recommendations:', !!advisory?.recommendations, '- Count:', advisory?.recommendations?.length || 0);
    console.log('Has patchDetails:', !!advisory?.patchDetails, '- Count:', advisory?.patchDetails?.length || 0);
    console.log('Has mitreTactics:', !!advisory?.mitreTactics, '- Count:', advisory?.mitreTactics?.length || 0);
    console.log('Has affectedProducts:', !!advisory?.affectedProducts, '- Count:', advisory?.affectedProducts?.length || 0);
    console.log('Has targetSectors:', !!advisory?.targetSectors, '- Count:', advisory?.targetSectors?.length || 0);
    console.log('TLP:', advisory?.tlp || 'Not set');
    console.log('Published Date:', advisory?.publishedDate || 'Not set');
    
    console.log('\n=== SAMPLE DATA ===');
    if (advisory?.recommendations) {
      console.log('First recommendation:', advisory.recommendations[0]);
    }
    if (advisory?.patchDetails) {
      console.log('First patch detail:', advisory.patchDetails[0]);
    } else {
      console.log('🚨 NO PATCH DETAILS FOUND - This is why patch section is missing!');
    }
    
    console.log('\n=== FIELDS PRESENT ===');
    console.log('All fields:', Object.keys(advisory || {}));
    
    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAdvisoryStructure();
