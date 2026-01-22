import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { Client } from '@opensearch-project/opensearch';

// Initialize OpenSearch client
const osClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
  ssl: { rejectUnauthorized: false },
});

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
