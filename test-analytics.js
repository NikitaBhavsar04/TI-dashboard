const axios = require('axios');

async function testAnalytics() {
  try {
    console.log('Testing analytics API...');
    
    const response = await axios.get('http://localhost:3000/api/emails/tracking?startDate=2024-01-01&endDate=2025-01-31', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Analytics data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing analytics:', error.message);
    if (error.response) {
      console.log('Error response status:', error.response.status);
      console.log('Error response data:', error.response.data);
    }
  }
}

testAnalytics();
