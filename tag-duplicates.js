require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const tagDuplicates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Advisory = mongoose.model('Advisory', new mongoose.Schema({}, { strict: false }));
    
    const advisories = await Advisory.find({}).sort({ createdAt: 1, _id: 1 }).lean();
    console.log('Total advisories:', advisories.length);

    // Group by title
    const titleMap = new Map();
    advisories.forEach(adv => {
      const title = adv.title?.toLowerCase().trim();
      if (!title) return;
      
      if (!titleMap.has(title)) {
        titleMap.set(title, []);
      }
      titleMap.get(title).push(adv);
    });

    // Find duplicates and tag them
    let updatedCount = 0;
    
    for (const [title, advs] of titleMap.entries()) {
      if (advs.length > 1) {
        console.log(`\nProcessing "${title}" - ${advs.length} copies`);
        
        // Keep the first one (oldest), mark it with duplicate count
        const firstAdv = advs[0];
        const duplicateCount = advs.length - 1;
        
        // Add "duplicate" tag with count to first advisory
        const firstTags = firstAdv.tags || [];
        if (!firstTags.some(t => t.toLowerCase().includes('duplicate'))) {
          firstTags.push(`duplicate-${duplicateCount}`);
          await Advisory.updateOne(
            { _id: firstAdv._id },
            { $set: { tags: firstTags } }
          );
          console.log(`  ✓ Tagged first advisory (${firstAdv._id}) with "duplicate-${duplicateCount}"`);
          updatedCount++;
        }
        
        // Optionally, you can delete the duplicate entries or just mark them
        // For now, let's just log them
        for (let i = 1; i < advs.length; i++) {
          console.log(`  - Duplicate ${i}: ${advs[i]._id} (can be deleted)`);
        }
      }
    }

    console.log(`\n\nTotal advisories tagged: ${updatedCount}`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

tagDuplicates();
