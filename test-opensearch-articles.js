const { Client } = require('@opensearch-project/opensearch');

const osClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
  ssl: { rejectUnauthorized: false },
});

const OPENSEARCH_INDEX = 'ti-raw-articles';

async function testOpenSearch() {
  try {
    console.log('Testing OpenSearch connection...');
    
    // Check cluster health
    const health = await osClient.cluster.health();
    console.log('Cluster status:', health.body.status);
    
    // Check if index exists
    const indexExists = await osClient.indices.exists({ index: OPENSEARCH_INDEX });
    console.log(`Index "${OPENSEARCH_INDEX}" exists:`, indexExists.body);
    
    if (indexExists.body) {
      // Count documents
      const count = await osClient.count({ index: OPENSEARCH_INDEX });
      console.log(`Total articles in index: ${count.body.count}`);
      
      // Get sample articles
      const response = await osClient.search({
        index: OPENSEARCH_INDEX,
        body: {
          query: { match_all: {} },
          size: 5,
          sort: [{ fetched_at: { order: 'desc' } }]
        }
      });
      
      console.log(`\nSample articles (showing ${response.body.hits.hits.length}):`);
      response.body.hits.hits.forEach((hit, idx) => {
        console.log(`\n${idx + 1}. ${hit._source.title}`);
        console.log(`   Source: ${hit._source.source}`);
        console.log(`   Status: ${hit._source.status}`);
        console.log(`   Fetched: ${hit._source.fetched_at}`);
      });
    } else {
      console.log('\nIndex does not exist. Run the fetcher to populate it.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOpenSearch();
