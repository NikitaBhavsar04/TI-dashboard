import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

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

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    try {
      const backendPath = path.join(process.cwd(), 'backend');
      const scriptPath = path.join(backendPath, 'all_feeds.py');

      // Resolve the best Python executable to use. Priority:
      // 1. process.env.PYTHON_EXECUTABLE (explicit)
      // 2. active virtualenv via VIRTUAL_ENV
      // 3. active conda via CONDA_PREFIX
      // 4. project venv at ./venv
      // 5. fallback to platform default ('python'|'python3')
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

      console.log('[RAW-ARTICLES] Using Python command:', pythonCmd);

      // Prepare env for the spawned process. If using a venv-like path, prepend its bin/Scripts to PATH
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

      const python = spawn(pythonCmd, [scriptPath], {
        cwd: backendPath,
        env: childEnv
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
  } catch (error: any) {
    console.error('Error in authentication:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Authentication error',
      details: error.message
    });
  }
}
