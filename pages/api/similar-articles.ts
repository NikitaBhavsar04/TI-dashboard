import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';

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
    
    // Determine Python command (check if in virtual environment)
    const pythonCommand = process.env.PYTHON_PATH || 'python';

    // Execute the Python script
    const similarArticles = await new Promise<SimilarArticle[]>((resolve, reject) => {
      const pythonProcess = spawn(pythonCommand, [scriptPath, articleId]);
      
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
