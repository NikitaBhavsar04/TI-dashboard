import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@opensearch-project/opensearch';
import { verifyToken } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;
const index = process.env.OPENSEARCH_ADVISORY_INDEX || 'ti-generated-advisories';

if (!opensearchUrl && !host) {
  throw new Error('OPENSEARCH_URL or OPENSEARCH_HOST must be set');
}

const isLocalhost = host === 'localhost' || host === '127.0.0.1';
const protocol = isLocalhost ? 'http' : 'https';
const nodeUrl = opensearchUrl || `${protocol}://${host}:${port}`;

const clientConfig: any = {
  node: nodeUrl,
  ssl: { rejectUnauthorized: false },
};

if (username && password) {
  clientConfig.auth = { username, password };
}

const client = new Client(clientConfig);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  const { advisory_id } = req.body;

  if (!advisory_id) {
    return res.status(400).json({ error: 'advisory_id is required' });
  }

  console.log('[IP-SWEEP] Starting IP sweep for advisory:', advisory_id);

  try {
    // Run the Python IP sweep script
    const pythonScript = path.join(process.cwd(), 'backend', 'ip_sweep.py');

    // Resolve the best Python executable (same logic as manual-advisory/generate.ts)
    // Priority: 1. PYTHON_EXECUTABLE env, 2. VIRTUAL_ENV, 3. CONDA_PREFIX, 4. project venv, 5. platform default
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

    console.log('[IP-SWEEP] Using Python executable:', pythonCmd);

    const pythonProcess = spawn(pythonCmd, [pythonScript, advisory_id]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      // Log Python stderr in real-time so we can see what's happening
      console.log('[IP-SWEEP][Python]', chunk.trim());
    });

    await new Promise<void>((resolve, reject) => {
      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          console.error('[IP-SWEEP] Python script failed:', stderr);
          reject(new Error(`IP sweep script failed: ${stderr}`));
          return;
        }

        try {
          console.log('[IP-SWEEP] Raw stdout:', stdout);

          // Extract JSON from stdout (script may output logs before JSON)
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No valid JSON output from IP sweep script');
          }

          const sweepResults = JSON.parse(jsonMatch[0]);
          console.log('[IP-SWEEP] Parsed results:', sweepResults);

          // Update the advisory document with IP sweep results
          await updateAdvisoryWithSweepResults(advisory_id, sweepResults);

          res.status(200).json({
            success: true,
            results: sweepResults
          });
          resolve();
        } catch (error: any) {
          console.error('[IP-SWEEP] Error processing results:', error);
          reject(error);
        }
      });
    });

  } catch (error: any) {
    console.error('[IP-SWEEP] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to perform IP sweep',
      details: error.toString()
    });
  }
}

async function updateAdvisoryWithSweepResults(advisory_id: string, sweepResults: any) {
  try {
    console.log('[IP-SWEEP] Updating advisory with sweep results:', advisory_id);

    // First, find the document
    const searchResult = await client.search({
      index,
      body: {
        size: 1,
        query: {
          bool: {
            should: [
              { term: { 'advisory_id.keyword': advisory_id } },
              { term: { advisory_id } },
              { match: { advisory_id } }
            ],
            minimum_should_match: 1
          }
        }
      }
    });

    if (searchResult.body.hits?.hits?.length === 0) {
      throw new Error(`Advisory not found: ${advisory_id}`);
    }

    const doc = searchResult.body.hits.hits[0];
    const docId = doc._id;

    console.log('[IP-SWEEP] Found document with _id:', docId);

    // Update the document with IP sweep results
    await client.update({
      index,
      id: docId,
      body: {
        doc: {
          ip_sweep: sweepResults
        }
      }
    });

    console.log('[IP-SWEEP] Successfully updated advisory with sweep results');
  } catch (error: any) {
    console.error('[IP-SWEEP] Error updating advisory:', error);
    throw error;
  }
}
