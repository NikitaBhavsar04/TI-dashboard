// Simple API to update advisory with patch details
export default async function handler(req, res) {
  try {
    // OpenSearch update logic (pseudo-code, adjust as needed)
    const { client } = require('../../lib/opensearchClient');
    // Find the most recent advisory in OpenSearch
    const response = await client.search({
      index: 'ti-generated-advisories',
      body: {
        size: 1,
        sort: [{ created_at: { order: 'desc' } }],
        query: { match_all: {} }
      }
    });
    const hits = response.body.hits.hits;
    if (!hits || hits.length === 0) {
      return res.status(404).json({ message: 'No advisory found' });
    }
    const advisory = hits[0]._source;
    const advisoryId = advisory.advisory_id || advisory.advisoryId;
    // Update advisory in OpenSearch
    const updateResult = await client.update({
      index: 'ti-generated-advisories',
      id: hits[0]._id,
      body: {
        doc: {
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
    });
    if (updateResult.body.result === 'updated' || updateResult.body.result === 'noop') {
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
