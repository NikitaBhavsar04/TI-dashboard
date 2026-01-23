// Normalize backend advisory fields to frontend schema
function normalizeAdvisoryFields(advisory: any) {
  if (!advisory || typeof advisory !== 'object') return advisory;
  return {
    ...advisory,
    advisoryId: advisory.advisory_id || advisory.advisoryId,
    severity: advisory.criticality || advisory.severity,
    category: advisory.threat_type || advisory.category,
    affectedProducts: advisory.affectedProducts || (advisory.affected_product ? [advisory.affected_product] : []),
    affectedProduct: advisory.affected_product || (advisory.affectedProducts && advisory.affectedProducts[0]),
    cveIds: advisory.cves || advisory.cveIds,
    patchDetails: advisory.patch_details || advisory.patchDetails,
    mitreTactics: advisory.mitre || advisory.mitreTactics,
    publishedDate: advisory.created_at || advisory.publishedDate,
    executiveSummary: advisory.exec_summary_parts ? advisory.exec_summary_parts.join('\n\n') : advisory.executiveSummary,
    description: advisory.exec_summary_parts ? advisory.exec_summary_parts.join('\n\n') : advisory.description,
  };
}
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
        advisoryId: articleId,
        title: `Security Advisory - Article ${articleId}`,
        summary: 'This advisory was generated in a serverless environment. Please review and customize the content.',
        severity: 'Medium',
        category: 'General',
        description: 'Advisory generated from article analysis. Requires manual review.',
        content: 'Advisory generated from article analysis. Requires manual review and customization.',
        author: 'TI-Dashboard System',
        recommendations: [
          'Review the source article for specific details',
          'Customize this advisory based on the threat intelligence',
          'Update severity and category as appropriate'
        ],
        references: [],
        tags: ['auto-generated', 'serverless'],
        iocs: []
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

    console.log('[MANUAL-ADVISORY] Generating advisory for article:', articleId);
    console.log('[MANUAL-ADVISORY] Backend path:', backendPath);
    console.log('[MANUAL-ADVISORY] Script path:', scriptPath);
    console.log('[MANUAL-ADVISORY] OpenSearch config:', {
      host: process.env.OPENSEARCH_HOST || 'localhost',
      port: process.env.OPENSEARCH_PORT || '9200',
      username: process.env.OPENSEARCH_USERNAME ? '***' : '(empty)',
      password: process.env.OPENSEARCH_PASSWORD ? '***' : '(empty)'
    });

    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      console.error('[MANUAL-ADVISORY] Python script not found:', scriptPath);
      throw new Error(`Python script not found: ${scriptPath}`);
    }

    const python = spawn('python', [scriptPath, articleId], {
      cwd: backendPath,
      env: { 
        ...process.env,
        OPENSEARCH_HOST: process.env.OPENSEARCH_HOST || 'localhost',
        OPENSEARCH_PORT: process.env.OPENSEARCH_PORT || '9200',
        OPENSEARCH_USERNAME: process.env.OPENSEARCH_USERNAME || '',
        OPENSEARCH_PASSWORD: process.env.OPENSEARCH_PASSWORD || ''
      },
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
        console.log(`[MANUAL-ADVISORY] Python process finished with code: ${code}`);
        if (code === 0) {
          resolve(true);
        } else {
          console.error(`[MANUAL-ADVISORY] Process failed with code ${code}`);
          console.error(`[MANUAL-ADVISORY] STDERR: ${stderr}`);
          console.error(`[MANUAL-ADVISORY] STDOUT: ${stdout}`);
          reject(new Error(`Process exited with code ${code}. Error: ${stderr || 'Unknown error'}`));
        }
      });

      python.on('error', (err) => {
        console.error(`[MANUAL-ADVISORY] Process error:`, err);
        console.log('[MANUAL-ADVISORY] Python failed, using fallback method');
        
        const fallbackAdvisory = {
          advisory_id: articleId,
          title: `Security Advisory - Article ${articleId}`,
          summary: 'Advisory generated after Python execution failed. Please customize.',
          criticality: 'Medium',
          threat_type: 'General',
          description: 'Advisory generated from article analysis. Requires manual review.',
          content: 'Advisory generated from article analysis. Requires manual review and customization.',
          author: 'TI-Dashboard System',
          recommendations: [
            'Review the source article for specific details',
            'Customize this advisory based on the threat intelligence'
          ],
          references: [],
          tags: ['auto-generated', 'error-recovery'],
          iocs: []
        };

        return res.status(200).json({ 
          success: true, 
          advisory: normalizeAdvisoryFields(fallbackAdvisory),
          note: 'Generated in error recovery mode. Please review and customize.',
          warning: 'Python backend unavailable'
        });
      });
    });

    console.log('[MANUAL-ADVISORY] Advisory generated successfully via Python');

    // Parse the advisory from stdout or file
    try {
      console.log('[MANUAL-ADVISORY] Raw stdout length:', stdout.length);
      console.log('[MANUAL-ADVISORY] Raw stdout (first 500 chars):', stdout.substring(0, 500));
      console.log('[MANUAL-ADVISORY] Raw stdout (last 500 chars):', stdout.substring(Math.max(0, stdout.length - 500)));
      
      // Try to extract JSON if there are log messages mixed in
      let jsonStr = stdout.trim();
      
      // If stdout has multiple lines, try to find the JSON object
      if (jsonStr.includes('\n')) {
        const lines = jsonStr.split('\n');
        // Look for a line that starts with {
        for (const line of lines) {
          if (line.trim().startsWith('{')) {
            jsonStr = line.trim();
            break;
          }
        }
      }
      
      console.log('[MANUAL-ADVISORY] Attempting to parse JSON...');
      const advisory = JSON.parse(jsonStr);
      console.log('[MANUAL-ADVISORY] ✅ Parsed advisory successfully');
      console.log('[MANUAL-ADVISORY] Advisory ID from Python:', advisory.advisory_id);
      
      const normalized = normalizeAdvisoryFields(advisory);
      console.log('[MANUAL-ADVISORY] Advisory IDs in normalized:', {
        advisory_id: normalized.advisory_id,
        advisoryId: normalized.advisoryId
      });
      
      return res.status(200).json({ 
        success: true, 
        advisory: normalized
      });
    } catch (parseError) {
      console.error('[MANUAL-ADVISORY] Failed to parse advisory JSON');
      
      // Fallback if JSON parsing fails
      const fallbackAdvisory = {
        advisory_id: articleId,
        title: `Security Advisory - Article ${articleId}`,
        summary: 'Advisory generated but JSON parsing failed. Please customize.',
        criticality: 'Medium',
        threat_type: 'General',
        description: 'Advisory generated from article analysis. Requires manual review.',
        content: 'Advisory generated from article analysis. Requires manual review and customization.',
        author: 'TI-Dashboard System',
        recommendations: [
          'Review the source article for specific details',
          'Check the Python script output for details'
        ],
        references: [],
        tags: ['auto-generated', 'parse-error'],
        iocs: [],
        raw_output: stdout
      };

      return res.status(200).json({ 
        success: true, 
        advisory: normalizeAdvisoryFields(fallbackAdvisory),
        note: 'JSON parsing failed, using fallback advisory'
      });
    }

  } catch (error: any) {
    console.error('[MANUAL-ADVISORY] Error:', error);
    
    // Final fallback for any other errors
    const fallbackAdvisory = {
      advisory_id: articleId,
      title: `Security Advisory - Article ${articleId}`,
      summary: 'Advisory generated in error recovery mode. Please customize.',
      criticality: 'Medium',
      threat_type: 'General',
      description: 'Advisory generated from article analysis. Requires manual review.',
      content: 'Advisory generated from article analysis. Requires manual review and customization.',
      author: 'TI-Dashboard System',
      recommendations: [
        'Review the source article for specific details',
        'Customize this advisory based on the threat intelligence'
      ],
      references: [],
      tags: ['auto-generated', 'final-fallback'],
      iocs: []
    };

    return res.status(200).json({ 
      success: true, 
      advisory: normalizeAdvisoryFields(fallbackAdvisory),
      note: 'Generated in final fallback mode. Please review and customize.',
      error_details: error.message
    });
  }
}
