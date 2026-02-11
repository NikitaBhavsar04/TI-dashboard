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

// Auto-detect protocol: use http for localhost, https for cloud
const isLocalhost = host === 'localhost' || host === '127.0.0.1';
const protocol = isLocalhost ? 'http' : 'https';
const nodeUrl = opensearchUrl || `${protocol}://${host}:${port}`;

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
    // Allow all authenticated users to view advisories
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
    // Get all Eagle Nest advisories from OpenSearch
    try {
      console.log('[EAGLE-NEST] Fetching advisories from OpenSearch');
      
      const response = await client.search({
        index: ADVISORY_INDEX,
        body: {
          query: {
            match_all: {} // Fetch all advisories from the index
          },
          size: 1000, // Fetch up to 1000 advisories
          sort: [
            { created_at: { order: 'desc' } }
          ]
        }
      });

      const hits = response.body.hits.hits as Array<{ _source: unknown }>;
      const advisories = hits.map(hit => hit._source);
      
      console.log(`[EAGLE-NEST] Found ${advisories.length} advisories in OpenSearch`);

      return res.status(200).json({ success: true, advisories });
    } catch (error) {
      const err = error as Error;
      console.error('[EAGLE-NEST] Error fetching advisories from OpenSearch:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch advisories', details: err.message });
    }
  }

  if (req.method === 'POST') {
    // Save advisory to Eagle Nest (OpenSearch + local file for backward compatibility)
    try {
      const advisory = req.body;

      if (!advisory.advisory_id) {
        return res.status(400).json({ 
          error: 'Advisory ID required',
          success: false,
          received_fields: Object.keys(advisory)
        });
      }

      // Add status and timestamp
      advisory.status = 'EAGLE_NEST';
      advisory.saved_to_eagle_nest_at = new Date().toISOString();
      
      if (!advisory.created_at) {
        advisory.created_at = advisory.saved_to_eagle_nest_at;
      }

      console.log(`[EAGLE-NEST] Saving advisory to OpenSearch: ${advisory.advisory_id}`);

      // Save to OpenSearch
      try {
        await client.index({
          index: ADVISORY_INDEX,
          id: advisory.advisory_id,
          body: advisory,
          refresh: true
        });
        console.log(`[EAGLE-NEST] Successfully saved to OpenSearch: ${advisory.advisory_id}`);
      } catch (osError) {
        const err = osError as Error;
        console.error('[EAGLE-NEST] OpenSearch save error:', err);
        return res.status(500).json({ 
          error: 'Failed to save to OpenSearch',
          success: false,
          details: err.message
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Advisory saved to Eagle Nest',
        advisory_id: advisory.advisory_id
      });
    } catch (error) {
      const err = error as Error;
      console.error('[EAGLE-NEST] Error saving advisory:', err);
      return res.status(500).json({ 
        error: 'Failed to save advisory',
        success: false,
        details: err.message
      });
    }
  }

  if (req.method === 'DELETE') {
    // Delete advisory from Eagle Nest (OpenSearch + local file)
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Advisory ID required' });
      }

      console.log(`[EAGLE-NEST] Deleting advisory: ${id}`);

      // Delete from OpenSearch
      try {
        await client.delete({
          index: ADVISORY_INDEX,
          id: id,
          refresh: true
        });
        console.log(`[EAGLE-NEST] Deleted from OpenSearch: ${id}`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Advisory deleted from Eagle Nest'
        });
      } catch (osError) {
        const err = osError as { meta?: { statusCode?: number } };
        if (err.meta?.statusCode === 404) {
          return res.status(404).json({ error: 'Advisory not found' });
        }
        const error = osError as Error;
        console.error('[EAGLE-NEST] OpenSearch delete error:', error);
        return res.status(500).json({ error: 'Failed to delete from OpenSearch', details: error.message });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Advisory deleted from Eagle Nest',
        advisory_id: id
      });
    } catch (error) {
      const err = error as Error;
      console.error('[EAGLE-NEST] Error deleting advisory:', err);
      return res.status(500).json({ error: 'Failed to delete advisory', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
