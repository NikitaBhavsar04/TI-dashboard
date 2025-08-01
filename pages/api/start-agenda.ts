import { NextApiRequest, NextApiResponse } from 'next';

let agendaStarted = false;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!agendaStarted && process.env.NODE_ENV !== 'production') {
      const { startAgenda } = require('../../lib/agenda');
      await startAgenda();
      agendaStarted = true;
      console.log('✅ Agenda started via API');
    }

    res.status(200).json({ 
      success: true, 
      message: agendaStarted ? 'Agenda already running' : 'Agenda started',
      environment: process.env.NODE_ENV 
    });
  } catch (error) {
    console.error('❌ Failed to start Agenda:', error);
    res.status(500).json({ 
      error: 'Failed to start Agenda', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
