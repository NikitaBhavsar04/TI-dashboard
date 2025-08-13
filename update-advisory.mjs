// Add patch details and metadata to existing advisory
import { connectToDatabase } from './lib/db.js';

async function updateAdvisoryFields() {
  try {
    const { db } = await connectToDatabase();
    
    // Get the most recent advisory
    const advisory = await db.collection('advisories').findOne({}, { sort: { createdAt: -1 } });
    
    if (!advisory) {
      console.log('No advisory found');
      return;
    }
    
    console.log('Found advisory:', advisory.title);
    console.log('Current patchDetails:', advisory.patchDetails?.length || 0);
    
    // Update the advisory with missing fields
    const updateResult = await db.collection('advisories').updateOne(
      { _id: advisory._id },
      {
        $set: {
          patchDetails: [
            'Download security update KB5042421 from Microsoft Update Catalog for CVE-2025-49715',
            'Apply patches during scheduled maintenance windows with proper backup procedures',
            'Verify patch installation success using Windows Update verification tools',
            'Test all Dynamics 365 functionality in staging environment before production',
            'Monitor systems for 48-72 hours post-patch for performance issues',
            'Update security documentation to reflect new patch levels',
            'Coordinate with Microsoft Support for enterprise deployment requirements'
          ],
          mitreTactics: [
            { tactic: 'Initial Access', technique: 'Exploit Public-Facing Application', id: 'T1190' },
            { tactic: 'Collection', technique: 'Data from Information Repositories', id: 'T1213' },
            { tactic: 'Exfiltration', technique: 'Exfiltration Over Command and Control Channel', id: 'T1041' }
          ],
          affectedProducts: ['Microsoft Dynamics 365 FastTrack Implementation Assets'],
          targetSectors: ['Financial Services', 'Healthcare', 'Retail', 'Other'],
          regions: ['Global', 'North America', 'Europe', 'Asia-Pacific'],
          tlp: 'AMBER'
        }
      }
    );
    
    console.log('✅ Advisory updated successfully');
    console.log('Modified count:', updateResult.modifiedCount);
    
    // Verify the update
    const updatedAdvisory = await db.collection('advisories').findOne({ _id: advisory._id });
    console.log('✅ Patch details count:', updatedAdvisory.patchDetails.length);
    console.log('✅ MITRE tactics count:', updatedAdvisory.mitreTactics.length);
    
  } catch (error) {
    console.error('Error updating advisory:', error);
  }
}

updateAdvisoryFields();
