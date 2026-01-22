const { Client } = require('@opensearch-project/opensearch');

const osClient = new Client({
  node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
  ssl: { rejectUnauthorized: false },
});

async function checkStructure() {
  try {
    const response = await osClient.search({
      index: 'ti-raw-articles',
      body: {
        query: { match_all: {} },
        size: 1
      }
    });
    
    console.log('Sample article structure:');
    console.log(JSON.stringify(response.body.hits.hits[0], null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkStructure();
