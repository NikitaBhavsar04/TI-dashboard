require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const checkDuplicates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Advisory = mongoose.model('Advisory', new mongoose.Schema({}, { strict: false }));
    
    const advisories = await Advisory.find({}).lean();
    console.log('Total advisories:', advisories.length);

    // Check for advisories with duplicate tag
    const duplicates = advisories.filter(adv => 
      adv.tags?.some(tag => tag.toLowerCase().includes('duplicate'))
    );
    
    console.log('\nAdvisories with "duplicate" tag:', duplicates.length);
    
    if (duplicates.length > 0) {
      duplicates.forEach(adv => {
        console.log(`\n- ID: ${adv._id}`);
        console.log(`  Title: ${adv.title}`);
        console.log(`  Tags: ${adv.tags?.join(', ')}`);
      });
    } else {
      console.log('\n✓ No advisories found with duplicate tag.');
    }

    // Check for potential title duplicates
    const titleMap = new Map();
    advisories.forEach(adv => {
      const title = adv.title?.toLowerCase();
      if (!titleMap.has(title)) {
        titleMap.set(title, []);
      }
      titleMap.get(title).push(adv);
    });

    const potentialDuplicates = Array.from(titleMap.entries())
      .filter(([title, advs]) => advs.length > 1);

    if (potentialDuplicates.length > 0) {
      console.log(`\n\nFound ${potentialDuplicates.length} potential duplicate titles:`);
      potentialDuplicates.forEach(([title, advs]) => {
        console.log(`\n"${title}" (${advs.length} times):`);
        advs.forEach(adv => {
          console.log(`  - ID: ${adv._id} | Created: ${adv.createdAt || 'N/A'}`);
        });
      });
    } else {
      console.log('\n\n✓ No duplicate titles found.');
    }

    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkDuplicates();
