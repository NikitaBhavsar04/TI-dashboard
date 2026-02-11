import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@opensearch-project/opensearch';
import { verifyToken } from '@/lib/auth';

// Prioritize OPENSEARCH_URL for AWS deployments
const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;
const index = process.env.OPENSEARCH_ADVISORY_INDEX || 'ti-generated-advisories';

if (!opensearchUrl && !host) {
  throw new Error('OPENSEARCH_URL or OPENSEARCH_HOST must be set');
}

// Auto-detect protocol: use http for localhost, https for cloud
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

  const { advisory_id } = req.query;
  
  console.log('[API] Fetching advisory with ID:', advisory_id);
  
  if (!advisory_id || typeof advisory_id !== 'string') {
    console.error('[API] Missing or invalid advisory_id:', advisory_id);
    return res.status(400).json({ error: 'Missing advisory_id' });
  }
  
  try {
    // Try multiple query strategies to find the advisory
    let result;
    
    // Strategy 1: Try exact match on advisory_id field
    try {
      console.log('[API] Strategy 1: Searching with term query on advisory_id');
      result = await client.search({
        index,
        body: {
          size: 1,
          query: { 
            term: { 'advisory_id.keyword': advisory_id } 
          },
        },
      });
      
      if (result.body.hits?.hits?.length > 0) {
        console.log('[API] Found advisory with strategy 1');
        return res.status(200).json(result.body.hits.hits[0]);
      }
    } catch (err) {
      console.log('[API] Strategy 1 failed, trying strategy 2');
    }
    
    // Strategy 2: Try without .keyword
    try {
      console.log('[API] Strategy 2: Searching without .keyword');
      result = await client.search({
        index,
        body: {
          size: 1,
          query: { 
            term: { advisory_id } 
          },
        },
      });
      
      if (result.body.hits?.hits?.length > 0) {
        console.log('[API] Found advisory with strategy 2');
        return res.status(200).json(result.body.hits.hits[0]);
      }
    } catch (err) {
      console.log('[API] Strategy 2 failed, trying strategy 3');
    }
    
    // Strategy 3: Try match query
    try {
      console.log('[API] Strategy 3: Searching with match query');
      result = await client.search({
        index,
        body: {
          size: 1,
          query: { 
            match: { advisory_id } 
          },
        },
      });
      
      if (result.body.hits?.hits?.length > 0) {
        console.log('[API] Found advisory with strategy 3');
        return res.status(200).json(result.body.hits.hits[0]);
      }
    } catch (err) {
      console.log('[API] Strategy 3 failed, trying strategy 4');
    }
    
    // Strategy 4: Try getting by document _id
    try {
      console.log('[API] Strategy 4: Getting by document _id');
      result = await client.get({
        index,
        id: advisory_id,
      });
      
      if (result.body.found) {
        console.log('[API] Found advisory with strategy 4');
        return res.status(200).json(result.body);
      }
    } catch (err) {
      console.log('[API] Strategy 4 failed:', err.message);
    }
    
    // If all strategies fail
    console.error('[API] Advisory not found with any strategy:', advisory_id);
    return res.status(404).json({ 
      error: 'Advisory not found', 
      advisory_id,
      message: 'Tried multiple search strategies but could not find the advisory'
    });
    
  } catch (error: any) {
    console.error('[API] Error fetching advisory:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.meta?.body || error.toString()
    });
  }
}
