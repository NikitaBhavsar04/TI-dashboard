import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { formatDate } from '@/lib/utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const advisory = await Advisory.findById(req.query.id);
    
    if (!advisory) {
      return res.status(404).json({ error: 'Advisory not found' });
    }

    // Since we can't easily generate PDF server-side with Next.js,
    // let's return the advisory data for client-side PDF generation
    res.status(200).json({ advisory });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
