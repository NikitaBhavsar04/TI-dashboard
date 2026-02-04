import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { Client } from '@opensearch-project/opensearch';

// Initialize OpenSearch client with proper credentials
const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

if (!opensearchUrl && !host) {
  throw new Error('OPENSEARCH_URL or OPENSEARCH_HOST must be set in environment variables');
}

// Use OPENSEARCH_URL if available (AWS deployment), otherwise construct from host/port
const nodeUrl = opensearchUrl || `https://${host}:${port}`;

const clientConfig: any = {
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
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    try {
      // Get pagination and search parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const searchQuery = req.query.search as string || '';
      const statusFilter = req.query.status as string || '';
      
      // Calculate offset for pagination
      const from = (page - 1) * pageSize;

      // Build query based on search and filter parameters
      let query: any = { match_all: {} };
      
      if (searchQuery || statusFilter) {
        const must: any[] = [];
        
        if (searchQuery) {
          must.push({
            multi_match: {
              query: searchQuery,
              fields: ['title^3', 'source^2', 'article_text', 'summary', 'cves'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          });
        }
        
        if (statusFilter && statusFilter !== 'all') {
          must.push({
            term: { 'status.keyword': statusFilter }
          });
        }
        
        query = { bool: { must } };
      } else if (statusFilter && statusFilter !== 'all') {
        query = { term: { 'status.keyword': statusFilter } };
      }

      // Fetch articles from OpenSearch with pagination
      const response = await osClient.search({
        index: OPENSEARCH_INDEX,
        body: {
          query,
          from, // Start from this position
          size: pageSize, // Number of results to return
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
        pagination: {
          page,
          pageSize,
          total: totalHits,
          totalPages: Math.ceil(totalHits / pageSize),
          hasMore: from + pageSize < totalHits,
          hasPrev: page > 1
        }
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
