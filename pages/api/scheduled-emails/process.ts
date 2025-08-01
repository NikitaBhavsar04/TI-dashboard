import type { NextApiRequest, NextApiResponse } from 'next';
import { processScheduledEmails } from '@/lib/emailScheduler';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check admin authentication
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Process scheduled emails
    const result = await processScheduledEmails();
    
    res.status(200).json({
      message: 'Email processing completed',
      processed: result.processed
    });

  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    res.status(500).json({ 
      message: 'Failed to process scheduled emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
