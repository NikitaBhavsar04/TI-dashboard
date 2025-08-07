const mongoose = require('mongoose');

// Connect to MongoDB (adjust the connection string as needed)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Advisory schema - simplified for migration
const AdvisorySchema = new mongoose.Schema({
  title: String,
  affectedProduct: String,  // Old field
  affectedProducts: [String], // New field
}, { strict: false }); // Allow other fields

const Advisory = mongoose.model('Advisory', AdvisorySchema);

const migrateAffectedProducts = async () => {
  try {
    console.log('Starting affected products migration...');
    
    // Find all advisories that have affectedProduct but no affectedProducts
    const advisoriesWithOldField = await Advisory.find({
      affectedProduct: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { affectedProducts: { $exists: false } },
        { affectedProducts: null },
        { affectedProducts: [] }
      ]
    });

    console.log(`Found ${advisoriesWithOldField.length} advisories to migrate`);

    for (const advisory of advisoriesWithOldField) {
      console.log(`Migrating advisory: ${advisory.title}`);
      console.log(`Old affectedProduct: "${advisory.affectedProduct}"`);
      
      // Split the affectedProduct string by comma and clean up
      const affectedProducts = advisory.affectedProduct
        .split(',')
        .map(product => product.trim())
        .filter(product => product.length > 0);
      
      console.log(`New affectedProducts: [${affectedProducts.join(', ')}]`);
      
      // Update the advisory
      await Advisory.findByIdAndUpdate(advisory._id, {
        affectedProducts: affectedProducts
      });
      
      console.log(`✅ Migrated advisory: ${advisory.title}\n`);
    }

    console.log('Migration completed successfully!');
    
    // Show summary
    const allAdvisories = await Advisory.find({});
    const withAffectedProducts = await Advisory.find({
      affectedProducts: { $exists: true, $ne: null, $ne: [] }
    });
    
    console.log(`\nSummary:`);
    console.log(`Total advisories: ${allAdvisories.length}`);
    console.log(`Advisories with affected products: ${withAffectedProducts.length}`);
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the migration
connectDB().then(() => {
  migrateAffectedProducts();
});
