import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface SimilarArticle {
  id: string;
  title: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Require admin access
  try {
    requireAdmin(req);
  } catch (e) {
    const error = e as Error;
    return res.status(403).json({ success: false, error: 'Admin access required', message: error.message });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { articleId } = req.query;

  if (!articleId || typeof articleId !== 'string') {
    return res.status(400).json({ error: 'Article ID is required' });
  }

  try {
    console.log(`[SIMILAR-ARTICLES] Finding similar articles for: ${articleId}`);

    // Path to the Python script
    const scriptPath = path.join(process.cwd(), 'backend', 'similiar_article.py');
    
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

    console.log(`[SIMILAR-ARTICLES] Using Python executable: ${pythonCmd}`);

    // Prepare env for spawned process
    const childEnv = { 
      ...process.env,
      OPENSEARCH_URL: process.env.OPENSEARCH_URL || '',
      OPENSEARCH_HOST: process.env.OPENSEARCH_HOST || '',
      OPENSEARCH_PORT: process.env.OPENSEARCH_PORT || '9200',
      OPENSEARCH_USERNAME: process.env.OPENSEARCH_USERNAME || '',
      OPENSEARCH_PASSWORD: process.env.OPENSEARCH_PASSWORD || ''
    } as NodeJS.ProcessEnv;

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

    // Execute the Python script
    const similarArticles = await new Promise<SimilarArticle[]>((resolve, reject) => {
      const pythonProcess = spawn(pythonCmd, [scriptPath, articleId], {
        cwd: path.join(process.cwd(), 'backend'),
        env: childEnv
      });
      
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[SIMILAR-ARTICLES] Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[SIMILAR-ARTICLES] Python script failed:', stderr);
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Extract JSON from stdout (ignore debug messages)
          // Find the first '[' which starts the JSON array
          const jsonStart = stdout.indexOf('[');
          if (jsonStart === -1) {
            console.error('[SIMILAR-ARTICLES] No JSON array found in output:', stdout);
            reject(new Error('No JSON data found in response'));
            return;
          }

          const jsonString = stdout.substring(jsonStart).trim();
          console.log('[SIMILAR-ARTICLES] Extracted JSON:', jsonString.substring(0, 100) + '...');
          
          // Parse the JSON output from the Python script
          const result = JSON.parse(jsonString);
          console.log(`[SIMILAR-ARTICLES] Found ${result.length} similar articles`);
          resolve(result);
        } catch (parseError) {
          console.error('[SIMILAR-ARTICLES] Failed to parse Python output:', stdout);
          console.error('[SIMILAR-ARTICLES] Parse error:', parseError);
          reject(new Error('Failed to parse similar articles response'));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('[SIMILAR-ARTICLES] Failed to spawn Python process:', error);
        reject(error);
      });
    });

    return res.status(200).json({ 
      success: true, 
      similarArticles,
      count: similarArticles.length
    });

  } catch (error) {
    const err = error as Error;
    console.error('[SIMILAR-ARTICLES] Error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to find similar articles', 
      details: err.message 
    });
  }
}
