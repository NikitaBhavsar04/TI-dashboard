import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check admin authentication
  try {
    requireAdmin(req);
  } catch (e: any) {
    return res.status(403).json({ success: false, error: 'Admin access required', message: e.message });
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Advisory ID required' });
      }

      const eagleNestPath = path.join(process.cwd(), 'backend', 'workspace', 'eagle_nest');
      const filePath = path.join(eagleNestPath, `${id}.json`);

      console.log('[EAGLE-NEST] Fetching single advisory:', id);
      console.log('[EAGLE-NEST] File path:', filePath);
      console.log('[EAGLE-NEST] File exists:', fs.existsSync(filePath));

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Advisory not found' });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const advisory = JSON.parse(content);

      console.log('[EAGLE-NEST] Advisory loaded:', advisory.advisory_id);

      return res.status(200).json({ success: true, advisory });
    } catch (error: any) {
      console.error('[EAGLE-NEST] Error fetching advisory:', error);
      return res.status(500).json({ error: 'Failed to fetch advisory' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
