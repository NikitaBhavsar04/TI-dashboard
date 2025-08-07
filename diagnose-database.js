const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Advisory schema - allow all fields
const AdvisorySchema = new mongoose.Schema({}, { strict: false });
const Advisory = mongoose.model('Advisory', AdvisorySchema);

const diagnoseData = async () => {
  try {
    console.log('=== DIAGNOSTIC REPORT ===\n');
    
    // Get all advisories
    const advisories = await Advisory.find({}).lean();
    console.log(`Total advisories found: ${advisories.length}\n`);

    // Check each advisory for affected products fields
    advisories.forEach((advisory, index) => {
      console.log(`--- Advisory ${index + 1}: ${advisory.title} ---`);
      console.log(`ID: ${advisory._id}`);
      
      // Check all possible field variations
      console.log('Field Analysis:');
      console.log(`  affectedProduct: ${JSON.stringify(advisory.affectedProduct)}`);
      console.log(`  affectedProducts: ${JSON.stringify(advisory.affectedProducts)}`);
      console.log(`  affectedSystems: ${JSON.stringify(advisory.affectedSystems)}`);
      console.log(`  targetSectors: ${JSON.stringify(advisory.targetSectors)}`);
      console.log(`  regions: ${JSON.stringify(advisory.regions)}`);
      
      // Check if any affected products data exists
      const hasAffectedData = 
        (advisory.affectedProduct && advisory.affectedProduct.trim() !== '') ||
        (advisory.affectedProducts && advisory.affectedProducts.length > 0) ||
        (advisory.affectedSystems && advisory.affectedSystems.length > 0);
      
      console.log(`  Has affected products data: ${hasAffectedData}\n`);
    });

    // Summary statistics
    const withAffectedProduct = advisories.filter(a => a.affectedProduct && a.affectedProduct.trim() !== '');
    const withAffectedProducts = advisories.filter(a => a.affectedProducts && a.affectedProducts.length > 0);
    const withAffectedSystems = advisories.filter(a => a.affectedSystems && a.affectedSystems.length > 0);
    const withTargetSectors = advisories.filter(a => a.targetSectors && a.targetSectors.length > 0);
    const withRegions = advisories.filter(a => a.regions && a.regions.length > 0);

    console.log('=== SUMMARY ===');
    console.log(`Advisories with affectedProduct (string): ${withAffectedProduct.length}`);
    console.log(`Advisories with affectedProducts (array): ${withAffectedProducts.length}`);
    console.log(`Advisories with affectedSystems (array): ${withAffectedSystems.length}`);
    console.log(`Advisories with targetSectors: ${withTargetSectors.length}`);
    console.log(`Advisories with regions: ${withRegions.length}`);

    // Show sample data structure
    if (advisories.length > 0) {
      console.log('\n=== SAMPLE ADVISORY STRUCTURE ===');
      const sample = advisories[0];
      console.log('All fields in first advisory:');
      Object.keys(sample).forEach(key => {
        console.log(`  ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key]).substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the diagnostic
connectDB().then(() => {
  diagnoseData();
});
