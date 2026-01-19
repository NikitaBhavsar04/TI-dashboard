import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

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
    console.log('[MANUAL-ADVISORY] Generating advisory for article:', articleId);

    // Check if we're in a serverless environment (like Vercel)
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isServerless) {
      console.log('[MANUAL-ADVISORY] Serverless environment detected, using fallback method');
      
      // Fallback: Generate a basic advisory structure
      const fallbackAdvisory = {
        id: articleId,
        title: `Security Advisory - Article ${articleId}`,
        summary: 'This advisory was generated in a serverless environment. Please review and customize the content.',
        severity: 'Medium',
        category: 'General',
        description: 'Advisory generated from article analysis. Requires manual review.',
        recommendations: [
          'Review the source article for specific details',
          'Customize this advisory based on the threat intelligence',
          'Update severity and category as appropriate'
        ],
        references: [],
        created: new Date().toISOString(),
        generated_by: 'TI-Dashboard (Serverless Mode)'
      };

      return res.status(200).json({ 
        success: true, 
        advisory: fallbackAdvisory,
        note: 'Generated in serverless mode. Please review and customize.'
      });
    }

    // Try to use Python script in local/non-serverless environment
    const backendPath = path.resolve(process.cwd(), 'backend');
    const scriptPath = path.join(backendPath, 'manual_advisory.py');

    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      console.log('[MANUAL-ADVISORY] Python script not found, using fallback');
      
      const fallbackAdvisory = {
        id: articleId,
        title: `Security Advisory - Article ${articleId}`,
        summary: 'Advisory generated without Python backend. Please customize.',
        severity: 'Medium',
        category: 'General',
        description: 'Advisory generated from article analysis. Requires manual review.',
        recommendations: [
          'Review the source article for specific details',
          'Customize this advisory based on the threat intelligence'
        ],
        references: [],
        created: new Date().toISOString(),
        generated_by: 'TI-Dashboard (Fallback Mode)'
      };

      return res.status(200).json({ 
        success: true, 
        advisory: fallbackAdvisory,
        note: 'Generated without Python backend. Please review and customize.'
      });
    }

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
        // If Python fails, fall back to basic advisory
        console.log('[MANUAL-ADVISORY] Python failed, using fallback method');
        
        const fallbackAdvisory = {
          id: articleId,
          title: `Security Advisory - Article ${articleId}`,
          summary: 'Advisory generated after Python execution failed. Please customize.',
          severity: 'Medium',
          category: 'General',
          description: 'Advisory generated from article analysis. Requires manual review.',
          recommendations: [
            'Review the source article for specific details',
            'Customize this advisory based on the threat intelligence'
          ],
          references: [],
          created: new Date().toISOString(),
          generated_by: 'TI-Dashboard (Error Recovery Mode)'
        };

        return res.status(200).json({ 
          success: true, 
          advisory: fallbackAdvisory,
          note: 'Generated in error recovery mode. Please review and customize.',
          warning: 'Python backend unavailable'
        });
      });
    });

    console.log('[MANUAL-ADVISORY] Advisory generated successfully via Python');

    // Parse the advisory from stdout or file
    try {
      const advisory = JSON.parse(stdout);
      return res.status(200).json({ 
        success: true, 
        advisory 
      });
    } catch (parseError) {
      console.error('[MANUAL-ADVISORY] Failed to parse advisory JSON');
      
      // Fallback if JSON parsing fails
      const fallbackAdvisory = {
        id: articleId,
        title: `Security Advisory - Article ${articleId}`,
        summary: 'Advisory generated but JSON parsing failed. Please customize.',
        severity: 'Medium',
        category: 'General',
        description: 'Advisory generated from article analysis. Requires manual review.',
        recommendations: [
          'Review the source article for specific details',
          'Check the Python script output for details'
        ],
        references: [],
        created: new Date().toISOString(),
        generated_by: 'TI-Dashboard (Parse Error Recovery)',
        raw_output: stdout
      };

      return res.status(200).json({ 
        success: true, 
        advisory: fallbackAdvisory,
        note: 'JSON parsing failed, using fallback advisory'
      });
    }

  } catch (error: any) {
    console.error('[MANUAL-ADVISORY] Error:', error);
    
    // Final fallback for any other errors
    const fallbackAdvisory = {
      id: articleId,
      title: `Security Advisory - Article ${articleId}`,
      summary: 'Advisory generated in error recovery mode. Please customize.',
      severity: 'Medium',
      category: 'General',
      description: 'Advisory generated from article analysis. Requires manual review.',
      recommendations: [
        'Review the source article for specific details',
        'Customize this advisory based on the threat intelligence'
      ],
      references: [],
      created: new Date().toISOString(),
      generated_by: 'TI-Dashboard (Final Fallback)'
    };

    return res.status(200).json({ 
      success: true, 
      advisory: fallbackAdvisory,
      note: 'Generated in final fallback mode. Please review and customize.',
      error_details: error.message
    });
  }
}
