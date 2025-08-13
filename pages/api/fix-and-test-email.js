// API endpoint to add patch details and send test email
import { connectToDatabase } from '../../lib/db';
import { agenda } from '../../lib/agenda';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Get the most recent advisory
    const advisory = await db.collection('advisories').findOne({}, { sort: { createdAt: -1 } });
    
    if (!advisory) {
      return res.status(404).json({ message: 'No advisory found' });
    }

    console.log('Found advisory:', advisory.title);
    console.log('Current patchDetails:', advisory.patchDetails?.length || 0);

    // Add patch details if missing
    const patchDetails = [
      'Download security update KB5042421 from Microsoft Update Catalog for CVE-2025-49715',
      'Apply patches during scheduled maintenance windows with proper backup and rollback procedures',
      'Verify patch installation success using Windows Update verification and system validation tools',
      'Test all Dynamics 365 functionality thoroughly in staging environment before production deployment',
      'Monitor systems continuously for 48-72 hours post-patch for performance issues or unexpected behavior',
      'Update security baseline documentation and compliance reports to reflect new patch levels',
      'Coordinate with Microsoft Premier Support for any enterprise-specific deployment requirements'
    ];

    // Update the advisory with patch details
    await db.collection('advisories').updateOne(
      { _id: advisory._id },
      { 
        $set: { 
          patchDetails: patchDetails,
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

    // Get the updated advisory
    const updatedAdvisory = await db.collection('advisories').findOne({ _id: advisory._id });

    console.log('Updated advisory with patch details:', updatedAdvisory.patchDetails.length);

    // Send test email
    await agenda.now('send email', {
      recipients: ['mayank@forensiccybertech.com'],
      advisory: updatedAdvisory,
      customMessage: 'Test email with patch details and metadata sections - all sections should now be visible'
    });

    res.status(200).json({
      message: 'Advisory updated with patch details and test email sent',
      advisoryId: advisory._id,
      patchDetailsCount: patchDetails.length,
      sectionsAdded: {
        patchDetails: patchDetails.length,
        mitreTactics: 3,
        affectedProducts: 1,
        targetSectors: 4,
        regions: 4
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to update advisory and send email', error: error.message });
  }
}
