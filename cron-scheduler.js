// cron-scheduler.js
// This script will process scheduled emails every minute using node-cron

const cron = require('node-cron');
const fetch = require('node-fetch');
require('dotenv').config();

// Use NEXTAUTH_URL or NEXT_PUBLIC_APP_URL from environment
const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;

if (!BASE_URL) {
  throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL environment variable must be set');
}

const PROCESS_URL = `${BASE_URL}/api/scheduled-emails/process`;
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
