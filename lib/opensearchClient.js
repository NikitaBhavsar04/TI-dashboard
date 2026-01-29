const { Client } = require('@opensearch-project/opensearch');
require('dotenv').config();

// Create OpenSearch client with proper credentials
// Prioritize OPENSEARCH_URL for AWS deployments
const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

if (!opensearchUrl && !host) {
  throw new Error('OPENSEARCH_URL or OPENSEARCH_HOST must be set in environment variables');
}

// Use OPENSEARCH_URL if available, otherwise construct from host/port
const nodeUrl = opensearchUrl || `https://${host}:${port}`;

const clientConfig = {
  node: nodeUrl,
  ssl: {
    rejectUnauthorized: false
  }
};

if (username && password) {
  clientConfig.auth = { username, password };
}

const client = new Client(clientConfig);

/**
 * Get advisory from OpenSearch by advisory_id
 * @param {string} advisoryId - The advisory ID (e.g., "SOC-TA-20260120-071709")
 * @returns {Promise<Object|null>} - Advisory data or null if not found
 */
async function getAdvisoryById(advisoryId) {
  try {
    console.log(`🔍 Querying OpenSearch for advisory: ${advisoryId}`);
    
    const response = await client.search({
      index: 'ti-generated-advisories',
      body: {
        query: {
          term: {
            'advisory_id.keyword': advisoryId
          }
        },
        size: 1
      }
    });

    const hits = response.body.hits.hits;
    
    if (hits && hits.length > 0) {
      const advisory = hits[0]._source;
      console.log(`Found advisory in OpenSearch: ${advisory.advisory_id}`);
      return advisory;
    }
    
    console.log(`⚠️ Advisory not found in OpenSearch: ${advisoryId}`);
    return null;
    
  } catch (error) {
    console.error(`❌ OpenSearch query error for ${advisoryId}:`, error.message);
    return null;
  }
}

/**
 * Test OpenSearch connection
 */
async function testConnection() {
  try {
    const info = await client.info();
    console.log('OpenSearch connected:', info.body.version.number);
    return true;
  } catch (error) {
    console.error('❌ OpenSearch connection failed:', error.message);
    return false;
  }
}

module.exports = {
  client,
  getAdvisoryById,
  testConnection
};
