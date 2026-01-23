import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@opensearch-project/opensearch';

const host = process.env.OPENSEARCH_HOST || 'localhost';
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;
const index = process.env.OPENSEARCH_ADVISORY_INDEX || 'ti-generated-advisories';

const isLocalhost = host === 'localhost' || host === '127.0.0.1';
const scheme = isLocalhost ? 'http' : 'https';

const clientConfig: any = {
  node: `${scheme}://${host}:${port}`,
  ssl: { rejectUnauthorized: false },
};

if (username && password) {
  clientConfig.auth = { username, password };
}

const client = new Client(clientConfig);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { advisory_id } = req.query;
  
  if (!advisory_id || typeof advisory_id !== 'string') {
    return res.status(400).json({ error: 'Missing advisory_id' });
  }
  
  try {
    const result = await client.search({
      index,
      body: {
        size: 1,
        query: { 
          term: { advisory_id } 
        },
      },
    });
    
    const hits = result.body.hits?.hits || [];
    
    if (!hits.length) {
      return res.status(404).json({ error: 'Advisory not found', advisory_id });
    }
    
    return res.status(200).json(hits[0]);
  } catch (error: any) {
    console.error('[API] Error fetching advisory:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
