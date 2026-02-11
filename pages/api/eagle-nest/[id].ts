import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, requireAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { Client } from '@opensearch-project/opensearch';

// Create OpenSearch client
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
  ssl: {
    rejectUnauthorized: false
  }
};

if (username && password) {
  clientConfig.auth = { username, password };
}

const client = new Client(clientConfig);
const ADVISORY_INDEX = 'ti-generated-advisories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Allow all authenticated users to view single advisories
    try {
      requireAuth(req, 'user'); // Minimum role: user (allows user, admin, super_admin)
    } catch (e) {
      const error = e as Error;
      return res.status(403).json({ success: false, error: 'Authentication required', message: error.message });
    }
  } else {
    // Require admin access for write operations
    try {
      requireAdmin(req);
    } catch (e) {
      const error = e as Error;
      return res.status(403).json({ success: false, error: 'Admin access required', message: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Advisory ID required' });
      }

      console.log('[EAGLE-NEST] Fetching single advisory from OpenSearch:', id);

      // First try to get from OpenSearch
      try {
        const response = await client.get({
          index: ADVISORY_INDEX,
          id: id
        });

        if (response.body._source) {
          const advisory = response.body._source;
          console.log('[EAGLE-NEST] Advisory loaded from OpenSearch:', advisory.advisory_id);
          return res.status(200).json({ success: true, advisory });
        } else {
          return res.status(404).json({ error: 'Advisory not found in OpenSearch' });
        }
      } catch (osError) {
        const err = osError as { meta?: { statusCode?: number } };
        if (err.meta?.statusCode === 404) {
          return res.status(404).json({ error: 'Advisory not found' });
        }
        console.error('[EAGLE-NEST] OpenSearch error:', osError);
        return res.status(500).json({ error: 'Failed to fetch advisory from OpenSearch' });
      }
    } catch (error) {
      const err = error as Error;
      console.error('[EAGLE-NEST] Error fetching advisory:', err);
      return res.status(500).json({ error: 'Failed to fetch advisory' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
