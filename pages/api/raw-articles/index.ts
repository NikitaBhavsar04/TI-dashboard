import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { Client } from '@opensearch-project/opensearch';

// OpenSearch client configuration
const opensearchClient = new Client({
  node: `http://${process.env.OPENSEARCH_HOST || 'localhost'}:${process.env.OPENSEARCH_PORT || 9200}`,
  auth: process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD ? {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD,
  } : undefined,
  ssl: {
    rejectUnauthorized: false,
  },
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
      // Query OpenSearch for raw articles
      const searchParams = {
        index: OPENSEARCH_INDEX,
        body: {
          query: {
            match_all: {}
          },
          sort: [
            {
              fetched_at: {
                order: 'desc'
              }
            }
          ],
          size: 1000 // Limit to 1000 articles, adjust as needed
        }
      };

      const response = await opensearchClient.search(searchParams);
      
      const articles = response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source
      }));

      return res.status(200).json({ 
        articles,
        count: articles.length,
        total: response.body.hits.total.value,
        lastFetched: articles.length > 0 ? articles[0].fetched_at : null
      });
    } catch (error: any) {
      console.error('Error querying OpenSearch:', error);
      
      // Handle case where index doesn't exist yet
      if (error.body?.error?.type === 'index_not_found_exception') {
        return res.status(200).json({ 
          articles: [], 
          count: 0,
          total: 0,
          message: 'No articles found. Index not created yet. Run the fetcher first.' 
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
