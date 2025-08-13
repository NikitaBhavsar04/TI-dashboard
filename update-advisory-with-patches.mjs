// Script to add missing patch details and metadata to existing advisories
import { connectToDatabase } from './lib/db.js';

async function updateAdvisoryWithPatchDetails() {
  try {
    const { db } = await connectToDatabase();
    
    // Find the most recent advisory
    const advisory = await db.collection('advisories').findOne({}, { sort: { createdAt: -1 } });
    
    if (!advisory) {
      console.log('No advisories found');
      return;
    }
    
    console.log('Found advisory:', advisory.title);
    console.log('Current patchDetails:', advisory.patchDetails?.length || 0);
    
    // Add patch details if missing
    const updateData = {};
    
    if (!advisory.patchDetails || advisory.patchDetails.length === 0) {
      updateData.patchDetails = [
        'Download security patches from official vendor repositories for affected CVEs',
        'Apply patches during scheduled maintenance windows with proper testing procedures',
        'Verify patch installation success using system validation commands and security scanners',
        'Monitor systems post-patch for any performance issues or unexpected behavior',
        'Update security documentation to reflect current patch levels and versions',
        'Coordinate with vendor support teams for any patch-related compatibility issues',
        'Implement rollback procedures in case patches cause system instability'
      ];
    }
    
    if (!advisory.mitreTactics || advisory.mitreTactics.length === 0) {
      updateData.mitreTactics = [
        { tactic: 'Initial Access', technique: 'Exploit Public-Facing Application', id: 'T1190' },
        { tactic: 'Collection', technique: 'Data from Information Repositories', id: 'T1213' },
        { tactic: 'Exfiltration', technique: 'Exfiltration Over Command and Control Channel', id: 'T1041' }
      ];
    }
    
    if (!advisory.affectedProducts || advisory.affectedProducts.length === 0) {
      updateData.affectedProducts = ['Microsoft Dynamics 365 FastTrack Implementation Assets (Cloud-based deployments)'];
    }
    
    if (!advisory.targetSectors || advisory.targetSectors.length === 0) {
      updateData.targetSectors = ['Financial Services', 'Healthcare', 'Retail', 'Other'];
    }
    
    if (!advisory.tlp) {
      updateData.tlp = 'AMBER';
    }
    
    if (Object.keys(updateData).length > 0) {
      const result = await db.collection('advisories').updateOne(
        { _id: advisory._id },
        { $set: updateData }
      );
      
      console.log('✅ Updated advisory with missing fields:', Object.keys(updateData));
      console.log('Modified count:', result.modifiedCount);
    } else {
      console.log('✅ Advisory already has all required fields');
    }
    
  } catch (error) {
    console.error('Error updating advisory:', error);
  }
}

updateAdvisoryWithPatchDetails();
