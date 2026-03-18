// cron-scheduler.js
// Polls /api/cron/process-emails every minute to fire due scheduled emails.
// Run alongside your Next.js server with PM2 or Docker:
//   node cron-scheduler.js
// Requires env vars: NEXTAUTH_URL (or NEXT_PUBLIC_APP_URL) and CRON_SECRET

const cron = require('node-cron');
require('dotenv').config();

// Use native fetch (Node 18+). No node-fetch needed.
const doFetch = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(m => m.default(...args));

const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
if (!BASE_URL) {
  throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL environment variable must be set');
}

const CRON_SECRET = process.env.CRON_SECRET || '';
if (!CRON_SECRET) {
  console.warn('[CRON-SCHEDULER] ⚠️  CRON_SECRET is not set — the /api/cron/process-emails endpoint will reject requests');
}

// Correct endpoint — the one with the real email-sending logic
const PROCESS_URL = `${BASE_URL}/api/cron/process-emails`;
const FETCH_ARTICLES_URL = `${BASE_URL}/api/cron/fetch-articles`;

// ─── Daily article fetcher — 09:00 AM IST = 03:30 AM UTC ──────────────────────
cron.schedule('30 3 * * *', async () => {
  const ts = new Date().toISOString();
  try {
    console.log(`[CRON-SCHEDULER] [${ts}] Triggering daily raw-article fetcher (09:00 IST)...`);
    const res = await doFetch(FETCH_ARTICLES_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout ? AbortSignal.timeout(300000) : undefined // 5 min
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[CRON-SCHEDULER] ❌ fetch-articles HTTP ${res.status}: ${text}`);
      return;
    }

    const result = await res.json();
    console.log(`[CRON-SCHEDULER] ✅ fetch-articles triggered: ${result.message || 'started'}`);
  } catch (err) {
    console.error(`[CRON-SCHEDULER] ❌ Error calling fetch-articles:`, err.message);
  }
}, {
  timezone: 'UTC'  // schedule is expressed in UTC; 03:30 UTC = 09:00 IST
});

// ─── Email processor — every minute ───────────────────────────────────────────
cron.schedule('* * * * *', async () => {
  const ts = new Date().toISOString();
  try {
    console.log(`[CRON-SCHEDULER] [${ts}] Triggering scheduled email processor...`);
    const res = await doFetch(PROCESS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      },
      // 50-second timeout so we don't overlap with next minute's invocation
      signal: AbortSignal.timeout ? AbortSignal.timeout(50000) : undefined
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[CRON-SCHEDULER] ❌ HTTP ${res.status}: ${text}`);
      return;
    }

    const result = await res.json();
    if (result.processed > 0) {
      console.log(`[CRON-SCHEDULER] ✅ Processed ${result.processed} email(s): sent=${result.sent}, failed=${result.failed}`);
    } else {
      console.log(`[CRON-SCHEDULER] ℹ️  No emails due`);
    }
  } catch (err) {
    console.error(`[CRON-SCHEDULER] ❌ Error calling process-emails:`, err.message);
  }
});

console.log(`[CRON-SCHEDULER] ✅ Started`);
console.log(`[CRON-SCHEDULER]   • Email processor : ${PROCESS_URL} — every minute`);
console.log(`[CRON-SCHEDULER]   • Article fetcher : ${FETCH_ARTICLES_URL} — daily 09:00 IST (03:30 UTC)`);
