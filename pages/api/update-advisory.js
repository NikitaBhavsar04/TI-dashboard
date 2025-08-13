// Simple API to update advisory with patch details
export default async function handler(req, res) {
  try {
    const { MongoClient } = require('mongodb');
    
    // Connect to database
    const client = new MongoClient('mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority');
    await client.connect();
    
    const db = client.db('threat-advisory');
    
    // Get most recent advisory
    const advisory = await db.collection('advisories').findOne({}, { sort: { createdAt: -1 } });
    
    if (!advisory) {
      return res.status(404).json({ message: 'No advisory found' });
    }
    
    // Update with patch details
    const updateResult = await db.collection('advisories').updateOne(
      { _id: advisory._id },
      {
        $set: {
          patchDetails: [
            'Download security update KB5042421 from Microsoft Update Catalog for CVE-2025-49715',
            'Apply patches during scheduled maintenance windows with proper backup procedures',
            'Verify patch installation success using Windows Update verification tools',
            'Test all Dynamics 365 functionality in staging environment before production deployment'
          ],
          mitreTactics: [
            { tactic: 'Initial Access', technique: 'Exploit Public-Facing Application', id: 'T1190' },
            { tactic: 'Collection', technique: 'Data from Information Repositories', id: 'T1213' }
          ],
          affectedProducts: ['Microsoft Dynamics 365 FastTrack Implementation Assets'],
          targetSectors: ['Financial Services', 'Healthcare', 'Retail'],
          tlp: 'AMBER'
        }
      }
    );
    
    await client.close();
    
    if (updateResult.modifiedCount > 0) {
      return res.status(200).json({ 
        message: 'Advisory updated with patch details and metadata',
        advisoryTitle: advisory.title,
        updated: true
      });
    } else {
      return res.status(400).json({ message: 'Failed to update advisory' });
    }
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Error updating advisory', error: error.message });
  }
}
