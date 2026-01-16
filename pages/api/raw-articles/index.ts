import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
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

  if (req.method === 'GET') {
    try {
      // Read raw_articles.json from workspace
      const filePath = path.join(process.cwd(), 'backend', 'workspace', 'raw_articles.json');
      
      if (!fs.existsSync(filePath)) {
        return res.status(200).json({ 
          articles: [], 
          message: 'No articles found. Run the fetcher first.' 
        });
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Handle empty or invalid JSON
      if (!fileContent || fileContent.trim() === '') {
        console.log('[RAW-ARTICLES] File is empty, initializing with empty array');
        fs.writeFileSync(filePath, '[]', 'utf-8');
        return res.status(200).json({ 
          articles: [], 
          message: 'No articles found. Run the fetcher first.' 
        });
      }
      
      let articles;
      try {
        articles = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('[RAW-ARTICLES] JSON parse error, resetting file:', parseError);
        fs.writeFileSync(filePath, '[]', 'utf-8');
        return res.status(200).json({ 
          articles: [], 
          message: 'Invalid data found. File has been reset. Please run the fetcher.' 
        });
      }

      return res.status(200).json({ 
        articles,
        count: articles.length,
        lastFetched: fs.statSync(filePath).mtime
      });
    } catch (error) {
      console.error('Error reading raw articles:', error);
      return res.status(500).json({ error: 'Failed to read raw articles' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
