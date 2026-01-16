import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { requireAdmin } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Only admin can update advisories
    requireAdmin(req);
    
    await dbConnect();

    const workspacePath = path.join(process.cwd(), 'workspace');
    
    // Find all advisories without htmlFileName
    const advisories = await Advisory.find({
      $or: [
        { htmlFileName: { $exists: false } },
        { htmlFileName: null },
        { htmlFileName: '' }
      ]
    });

    console.log(`Found ${advisories.length} advisories without HTML file names`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const advisory of advisories) {
      const expectedFileName = `${advisory.advisoryId}.html`;
      const htmlFilePath = path.join(workspacePath, expectedFileName);
      
      if (fs.existsSync(htmlFilePath)) {
        // HTML file exists, update the database
        advisory.htmlFileName = expectedFileName;
        await advisory.save();
        
        results.push({
          advisoryId: advisory.advisoryId,
          status: 'success',
          htmlFileName: expectedFileName
        });
        successCount++;
      } else {
        results.push({
          advisoryId: advisory.advisoryId,
          status: 'not_found',
          message: 'HTML file does not exist in workspace'
        });
        failCount++;
      }
    }

    res.status(200).json({
      success: true,
      total: advisories.length,
      updated: successCount,
      notFound: failCount,
      results
    });

  } catch (error: any) {
    if (error.message === 'Authentication required' || error.message === 'Insufficient permissions') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Error updating HTML filenames:', error);
    res.status(500).json({ error: 'Failed to update HTML filenames', details: error.message });
  }
}
