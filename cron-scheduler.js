// cron-scheduler.js
// This script will process scheduled emails every minute using node-cron

const cron = require('node-cron');
const fetch = require('node-fetch');
require('dotenv').config();

// You may need to update this URL if your server runs on a different port or domain
const PROCESS_URL = 'http://localhost:3000/api/scheduled-emails/process';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

cron.schedule('* * * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] Running scheduled email processor...`);
    const res = await fetch(PROCESS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await res.json();
    console.log('Scheduled email process result:', result);
  } catch (err) {
    console.error('Error running scheduled email processor:', err);
  }
});

console.log('Scheduled email processor started.');
