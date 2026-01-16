import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    requireAdmin(req);
  } catch (e: any) {
    return res.status(403).json({ error: 'Admin required' });
  }

  const { articleId } = req.body;

  if (!articleId) {
    return res.status(400).json({ error: 'Article ID required' });
  }

  try {
    const backendPath = path.resolve(process.cwd(), 'backend');
    const scriptPath = path.join(backendPath, 'manual_advisory.py');

    console.log('[MANUAL-ADVISORY] Generating advisory for article:', articleId);

    const python = spawn('python', [scriptPath, articleId], {
      cwd: backendPath,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('[MANUAL-ADVISORY]', data.toString());
    });

    await new Promise((resolve, reject) => {
      python.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          console.error(`[MANUAL-ADVISORY] Process failed with code ${code}`);
          console.error(`[MANUAL-ADVISORY] STDERR: ${stderr}`);
          console.error(`[MANUAL-ADVISORY] STDOUT: ${stdout}`);
          reject(new Error(`Process exited with code ${code}. Error: ${stderr}`));
        }
      });

      python.on('error', (err) => {
        console.error(`[MANUAL-ADVISORY] Process error:`, err);
        reject(err);
      });
    });

    console.log('[MANUAL-ADVISORY] Advisory generated successfully');

    // Parse the advisory from stdout or file
    try {
      const advisory = JSON.parse(stdout);
      return res.status(200).json({ 
        success: true, 
        advisory 
      });
    } catch (parseError) {
      console.error('[MANUAL-ADVISORY] Failed to parse advisory JSON');
      return res.status(500).json({ 
        error: 'Failed to parse advisory', 
        details: stdout 
      });
    }

  } catch (error: any) {
    console.error('[MANUAL-ADVISORY] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate advisory',
      details: error.message 
    });
  }
}
