import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Allow all authenticated users to view advisories
    try {
      requireAuth(req, 'user'); // Minimum role: user (allows user, admin, super_admin)
    } catch (e: any) {
      return res.status(403).json({ success: false, error: 'Authentication required', message: e.message });
    }
  } else {
    // Require admin access for write operations
    try {
      requireAdmin(req);
    } catch (e: any) {
      return res.status(403).json({ success: false, error: 'Admin access required', message: e.message });
    }
  }

  if (req.method === 'GET') {
    // Get all Eagle Nest advisories
    try {
      const eagleNestPath = path.join(process.cwd(), 'backend', 'workspace', 'eagle_nest');
      
      if (!fs.existsSync(eagleNestPath)) {
        return res.status(200).json({ success: true, advisories: [] });
      }

      const files = fs.readdirSync(eagleNestPath).filter(f => f.endsWith('.json'));
      
      const advisories = files.map(file => {
        const content = fs.readFileSync(path.join(eagleNestPath, file), 'utf8');
        return JSON.parse(content);
      });

      // Sort by created date
      advisories.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return res.status(200).json({ success: true, advisories });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Failed to fetch advisories' });
    }
  }

  if (req.method === 'POST') {
    // Save advisory to Eagle Nest
    try {
      const advisory = req.body;

      if (!advisory.advisory_id) {
        return res.status(400).json({ 
          error: 'Advisory ID required',
          success: false,
          received_fields: Object.keys(advisory)
        });
      }

      const eagleNestPath = path.join(process.cwd(), 'backend', 'workspace', 'eagle_nest');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(eagleNestPath)) {
        fs.mkdirSync(eagleNestPath, { recursive: true });
      }

      const filePath = path.join(eagleNestPath, `${advisory.advisory_id}.json`);
      
      // Add status and timestamp
      advisory.status = 'EAGLE_NEST';
      advisory.saved_to_eagle_nest_at = new Date().toISOString();

      fs.writeFileSync(filePath, JSON.stringify(advisory, null, 2), 'utf8');

      return res.status(200).json({ 
        success: true, 
        message: 'Advisory saved to Eagle Nest',
        advisory_id: advisory.advisory_id
      });
    } catch (error: any) {
      return res.status(500).json({ 
        error: 'Failed to save advisory',
        success: false,
        details: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    // Delete advisory from Eagle Nest
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Advisory ID required' });
      }

      const eagleNestPath = path.join(process.cwd(), 'backend', 'workspace', 'eagle_nest');
      const filePath = path.join(eagleNestPath, `${id}.json`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Advisory not found' });
      }

      fs.unlinkSync(filePath);

      return res.status(200).json({ 
        success: true, 
        message: 'Advisory deleted from Eagle Nest',
        advisory_id: id
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to delete advisory' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
