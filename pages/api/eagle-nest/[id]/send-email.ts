import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check admin authentication
  try {
    requireAdmin(req);
  } catch (e: any) {
    return res.status(403).json({ success: false, error: 'Admin access required', message: e.message });
  }

  const { id } = req.query;
  const { recipients, subject, customMessage } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Advisory ID required' });
  }

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Recipients required' });
  }

  try {
    console.log('[EAGLE-NEST-EMAIL] Generating HTML and sending email for advisory:', id);

    const scriptPath = path.join(process.cwd(), 'backend', 'eagle_nest_email.py');
    
    // Prepare data for Python script
    const emailData = JSON.stringify({
      advisory_id: id,
      recipients,
      subject: subject || `Security Advisory: ${id}`,
      custom_message: customMessage || ''
    });

    // Spawn Python process
    const pythonProcess = spawn('python', [scriptPath], {
      cwd: path.join(process.cwd(), 'backend')
    });

    let outputData = '';
    let errorData = '';

    // Send data to stdin
    pythonProcess.stdin.write(emailData);
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error('[EAGLE-NEST-EMAIL] Python stderr:', data.toString());
    });

    await new Promise<void>((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python process exited with code ${code}: ${errorData}`));
        }
      });

      pythonProcess.on('error', (err) => {
        reject(err);
      });
    });

    // Parse output
    const result = JSON.parse(outputData);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        html_path: result.html_path,
        recipients: recipients.length
      });
    } else {
      throw new Error(result.error || 'Unknown error');
    }

  } catch (error: any) {
    console.error('[EAGLE-NEST-EMAIL] Error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
}
