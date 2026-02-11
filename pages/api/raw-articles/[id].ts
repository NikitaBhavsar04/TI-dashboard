import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { Client } from '@opensearch-project/opensearch';

// Initialize OpenSearch client
const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

const nodeUrl = opensearchUrl || `https://${host}:${port}`;

const clientConfig: {
  node: string;
  ssl: { rejectUnauthorized: boolean };
  auth?: { username: string; password: string };
} = {
  node: nodeUrl,
  ssl: { rejectUnauthorized: false },
};

if (username && password) {
  clientConfig.auth = { username, password };
}

const osClient = new Client(clientConfig);
const OPENSEARCH_INDEX = 'ti-raw-articles';

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
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Article ID is required' });
  }

  try {
    console.log('[RAW-ARTICLE-DETAIL] Fetching article by ID:', id);

    // Search for article by id field (not _id)
    // Try match query first since term with .keyword might not work
    const response = await osClient.search({
      index: OPENSEARCH_INDEX,
      body: {
        query: {
          match: {
            id: id
          }
        },
        size: 1
      }
    });

    const hits = response.body.hits.hits;

    if (hits.length === 0) {
      console.log('[RAW-ARTICLE-DETAIL] Article not found:', id);
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = {
      ...hits[0]._source,
      _id: hits[0]._id
    };

    console.log('[RAW-ARTICLE-DETAIL] Article found');

    return res.status(200).json({ 
      success: true,
      article
    });

  } catch (error) {
    const err = error as Error;
    console.error('[RAW-ARTICLE-DETAIL] Error fetching article:', err);
    
    return res.status(500).json({ 
      error: 'Failed to fetch article from OpenSearch',
      details: err.message 
    });
  }
}
