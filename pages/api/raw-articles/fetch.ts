import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify authentication
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'super_admin')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'POST') {
    try {
      const scriptPath = path.join(process.cwd(), 'backend', 'all_feeds.py');
      const backendPath = path.join(process.cwd(), 'backend');
      
      console.log('[RAW-ARTICLES] Script path:', scriptPath);
      console.log('[RAW-ARTICLES] Backend path:', backendPath);
      
      const python = spawn('python', [scriptPath], {
        cwd: backendPath,
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[Python stdout]:', data.toString());
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[Python stderr]:', data.toString());
      });

      python.on('close', (code) => {
        if (code === 0) {
          res.status(200).json({ 
            success: true,
            message: 'Articles fetched successfully',
            output: stdout
          });
        } else {
          res.status(500).json({ 
            success: false,
            error: 'Failed to fetch articles',
            output: stderr || stdout
          });
        }
      });

      python.on('error', (err) => {
        console.error('[Python error]:', err);
        res.status(500).json({ 
          success: false,
          error: 'Failed to start Python script',
          details: err.message
        });
      });
    } catch (error: any) {
      console.error('Error running fetcher:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to run fetcher script',
        details: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
