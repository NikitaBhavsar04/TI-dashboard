import { NextApiRequest, NextApiResponse } from 'next';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { requireAuth, requireAdmin } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // Initialize OpenSearch client
  const opensearch = new OpenSearchClient({
    node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
    auth: process.env.OPENSEARCH_AUTH
      ? {
          username: process.env.OPENSEARCH_AUTH.split(':')[0],
          password: process.env.OPENSEARCH_AUTH.split(':')[1],
        }
      : undefined,
  });

  switch (req.method) {

    case 'GET':
      try {
        // Fetch advisories from OpenSearch index 'ti-generated-advisories'
        const { search, category, severity } = req.query;
        const must: any[] = [];
        if (search) {
          must.push({
            multi_match: {
              query: search,
              fields: ['title^3', 'description', 'iocs.value', 'author', 'category', 'severity'],
              fuzziness: 'AUTO',
            },
          });
        }
        if (category) {
          must.push({ term: { category: category } });
        }
        if (severity) {
          must.push({ term: { severity: severity } });
        }
        const body: any = {
          query: must.length > 0 ? { bool: { must } } : { match_all: {} },
          sort: [{ publishedDate: { order: 'desc' } }],
          size: 100,
        };
        const result = await opensearch.search({
          index: 'ti-generated-advisories',
          body,
        });
        const advisories = result.body.hits.hits.map((hit: any) => hit._source);
        res.status(200).json(advisories);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch advisories' });
      }
      break;

    case 'POST':
      // POST is not supported with OpenSearch only (no DB write)
      res.status(405).json({ error: 'Advisory creation is not supported. Read-only OpenSearch integration.' });
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
