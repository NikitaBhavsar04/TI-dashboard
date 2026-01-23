import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { Client } from '@opensearch-project/opensearch';

// Initialize OpenSearch client with proper credentials
const host = process.env.OPENSEARCH_HOST || 'localhost';
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

const isLocalhost = host === 'localhost' || host === '127.0.0.1';
const scheme = isLocalhost ? 'http' : 'https';

const clientConfig: any = {
  node: `${scheme}://${host}:${port}`,
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
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch articles from OpenSearch
      const response = await osClient.search({
        index: OPENSEARCH_INDEX,
        body: {
          query: { match_all: {} },
          size: 10000, // Adjust based on your needs
          sort: [{ fetched_at: { order: 'desc' } }]
        }
      });

      const articles = response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        _id: hit._id
      }));

      // OpenSearch 7.x+ returns total as { value, relation }, older as number
      const totalHits = typeof response.body.hits.total === 'number'
        ? response.body.hits.total
        : response.body.hits.total.value;
      return res.status(200).json({ 
        articles,
        count: articles.length,
        total: totalHits
      });
    } catch (error: any) {
      console.error('Error fetching articles from OpenSearch:', error);
      
      // Handle index not found error
      if (error.meta?.statusCode === 404) {
        return res.status(200).json({ 
          articles: [], 
          count: 0,
          message: 'No articles found. Run the fetcher first.' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch articles from OpenSearch',
        details: error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
