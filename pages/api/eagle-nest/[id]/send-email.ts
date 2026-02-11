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

    // Resolve the best Python executable. Priority:
    // 1. process.env.PYTHON_EXECUTABLE, 2. VIRTUAL_ENV, 3. CONDA_PREFIX, 4. project venv, 5. platform default
    const envVars = process.env;
    let pythonCmd: string | undefined = envVars.PYTHON_EXECUTABLE;
    const tryJoin = (...parts: string[]) => path.join(...parts);

    if (!pythonCmd && envVars.VIRTUAL_ENV) {
      const venvRoot = envVars.VIRTUAL_ENV;
      const candidateWin = tryJoin(venvRoot, 'Scripts', 'python.exe');
      const candidatePosix = tryJoin(venvRoot, 'bin', 'python');
      if (process.platform === 'win32' && fs.existsSync(candidateWin)) pythonCmd = candidateWin;
      if (process.platform !== 'win32' && fs.existsSync(candidatePosix)) pythonCmd = candidatePosix;
    }

    if (!pythonCmd && envVars.CONDA_PREFIX) {
      const condaRoot = envVars.CONDA_PREFIX;
      const candidate = process.platform === 'win32' ? tryJoin(condaRoot, 'python.exe') : tryJoin(condaRoot, 'bin', 'python');
      if (fs.existsSync(candidate)) pythonCmd = candidate;
    }

    if (!pythonCmd) {
      const projectVenvWin = tryJoin(process.cwd(), 'venv', 'Scripts', 'python.exe');
      const projectVenvPosix = tryJoin(process.cwd(), 'venv', 'bin', 'python');
      if (process.platform === 'win32' && fs.existsSync(projectVenvWin)) pythonCmd = projectVenvWin;
      else if (process.platform !== 'win32' && fs.existsSync(projectVenvPosix)) pythonCmd = projectVenvPosix;
    }

    if (!pythonCmd) {
      pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    }

    // Prepare env for spawned process, prepending venv paths if used
    const childEnv = { ...process.env } as NodeJS.ProcessEnv;
    try {
      if (pythonCmd && pythonCmd.toLowerCase().includes(path.join('venv', 'scripts').toLowerCase())) {
        const scriptsPath = tryJoin(process.cwd(), 'venv', 'Scripts');
        childEnv.PATH = `${scriptsPath};${childEnv.PATH}`;
      } else if (pythonCmd && pythonCmd.toLowerCase().includes(path.join('venv', 'bin').toLowerCase())) {
        const binPath = tryJoin(process.cwd(), 'venv', 'bin');
        childEnv.PATH = `${binPath}:${childEnv.PATH}`;
      }
    } catch (e) {
      // ignore manipulation failures
    }

    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      cwd: path.join(process.cwd(), 'backend'),
      env: childEnv
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
