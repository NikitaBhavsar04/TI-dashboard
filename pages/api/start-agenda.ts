import { NextApiRequest, NextApiResponse } from 'next';

// ============================================================
// SINGLETON PATTERN USING NODE.JS GLOBAL OBJECT
// ============================================================
// This ensures only ONE Agenda worker runs, even with hot reload in development
declare global {
  var agendaStarted: boolean | undefined;
  var agendaInstance: any | undefined;
}

// Initialize global flag if not set
if (!global.agendaStarted) {
  global.agendaStarted = false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if Agenda is already running using global flag
    if (global.agendaStarted) {
      console.log('✅ Agenda already running (singleton check)');
      return res.status(200).json({
        success: true,
        message: 'Agenda already running',
        environment: process.env.NODE_ENV,
        singleton: true
      });
    }

    // Only start Agenda if not in production and not already started
    if (process.env.NODE_ENV !== 'production') {
      const { startAgenda } = require('../../lib/agenda');
      global.agendaInstance = await startAgenda();
      global.agendaStarted = true;
      console.log('✅ Agenda started via API (singleton initialized)');
    }

    res.status(200).json({
      success: true,
      message: 'Agenda started successfully',
      environment: process.env.NODE_ENV,
      singleton: false
    });
  } catch (error) {
    console.error('❌ Failed to start Agenda:', error);

    // Reset flag on error to allow retry
    global.agendaStarted = false;

    res.status(500).json({
      error: 'Failed to start Agenda',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
