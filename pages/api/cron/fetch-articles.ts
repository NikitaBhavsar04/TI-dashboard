/**
 * /api/cron/fetch-articles
 *
 * Runs backend/all_feeds.py to collect raw articles from all sources
 * (RSS, Reddit, Telegram). Triggered daily at 09:00 AM IST (03:30 UTC) by:
 *   - Vercel Cron  (configured in vercel.json)
 *   - cron-scheduler.js (for Docker / PM2 deployments)
 *
 * Secured with CRON_SECRET bearer token (same as process-emails endpoint).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const BACKEND_PATH = path.resolve(process.cwd(), 'backend');
const SCRIPT_PATH = path.join(BACKEND_PATH, 'all_feeds.py');

/** Resolve the best Python executable (same logic as auto-feed.ts) */
function resolvePython(): string {
  let pythonCmd = process.env.PYTHON_PATH || process.env.PYTHON_EXECUTABLE || '';

  const tryJoin = (...parts: string[]) => path.join(...parts);
  const env = process.env;

  if (!pythonCmd && env.VIRTUAL_ENV) {
    const win = tryJoin(env.VIRTUAL_ENV, 'Scripts', 'python.exe');
    const posix = tryJoin(env.VIRTUAL_ENV, 'bin', 'python');
    if (process.platform === 'win32' && fs.existsSync(win)) pythonCmd = win;
    else if (process.platform !== 'win32' && fs.existsSync(posix)) pythonCmd = posix;
  }

  if (!pythonCmd && env.CONDA_PREFIX) {
    const candidate =
      process.platform === 'win32'
        ? tryJoin(env.CONDA_PREFIX, 'python.exe')
        : tryJoin(env.CONDA_PREFIX, 'bin', 'python');
    if (fs.existsSync(candidate)) pythonCmd = candidate;
  }

  if (!pythonCmd) {
    const win = tryJoin(process.cwd(), 'venv', 'Scripts', 'python.exe');
    const posix = tryJoin(process.cwd(), 'venv', 'bin', 'python');
    if (process.platform === 'win32' && fs.existsSync(win)) pythonCmd = win;
    else if (process.platform !== 'win32' && fs.existsSync(posix)) pythonCmd = posix;
  }

  return pythonCmd || (process.platform === 'win32' ? 'python' : 'python3');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const authHeader = req.headers['authorization'] as string | undefined;
  const cronSecret = process.env.CRON_SECRET;

  if (!isVercelCron) {
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  // ── Script check ────────────────────────────────────────────────────────────
  if (!fs.existsSync(SCRIPT_PATH)) {
    return res.status(500).json({ error: `all_feeds.py not found at: ${SCRIPT_PATH}` });
  }

  const pythonCmd = resolvePython();
  console.log(`[CRON/fetch-articles] Using Python: ${pythonCmd}`);
  console.log(`[CRON/fetch-articles] Script: ${SCRIPT_PATH}`);

  // ── Build child env (prepend venv/Scripts or venv/bin to PATH) ─────────────
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  try {
    if (pythonCmd.toLowerCase().includes(path.join('venv', 'scripts').toLowerCase())) {
      childEnv.PATH = `${path.join(process.cwd(), 'venv', 'Scripts')};${childEnv.PATH}`;
    } else if (pythonCmd.toLowerCase().includes(path.join('venv', 'bin').toLowerCase())) {
      childEnv.PATH = `${path.join(process.cwd(), 'venv', 'bin')}:${childEnv.PATH}`;
    }
  } catch (_) { /* ignore */ }

  // ── Respond immediately (202) and let the process run async ────────────────
  // Vercel functions have a max duration; for long-running fetches this avoids
  // timeout issues while still logging progress server-side.
  const startedAt = new Date().toISOString();
  res.status(202).json({
    ok: true,
    message: 'Article fetch started',
    startedAt,
    script: SCRIPT_PATH,
    python: pythonCmd,
  });

  // ── Spawn all_feeds.py ──────────────────────────────────────────────────────
  const child = spawn(pythonCmd, [SCRIPT_PATH], {
    windowsHide: true,
    cwd: BACKEND_PATH,
    env: childEnv,
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  child.on('close', (code) => {
    const finishedAt = new Date().toISOString();
    if (code === 0) {
      console.log(`[CRON/fetch-articles] ✅ Completed (0) at ${finishedAt}`);
      if (stdout) console.log(`[CRON/fetch-articles] stdout:\n${stdout}`);
    } else {
      console.error(`[CRON/fetch-articles] ❌ Exited with code ${code} at ${finishedAt}`);
      if (stderr) console.error(`[CRON/fetch-articles] stderr:\n${stderr}`);
      if (stdout) console.log(`[CRON/fetch-articles] stdout:\n${stdout}`);
    }
  });

  child.on('error', (err) => {
    console.error(`[CRON/fetch-articles] ❌ Spawn error:`, err.message);
  });
}
