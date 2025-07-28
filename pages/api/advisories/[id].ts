import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import { requireAuth, requireAdmin } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const advisory = await Advisory.findById(id);
      
      if (!advisory) {
        return res.status(404).json({ message: 'Advisory not found' });
      }
      
      res.status(200).json(advisory);
    } catch (error) {
      console.error('Get advisory error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  } 
  else if (req.method === 'PUT') {
    // Update advisory - Admin only
    const authResult = await requireAdmin(req);
    if (!authResult || (authResult as any).error) {
      const error = (authResult as any).error || 'Unauthorized';
      const status = (authResult as any).status || 401;
      return res.status(status).json({ message: error });
    }

    try {
      const advisory = await Advisory.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
      });
      
      if (!advisory) {
        return res.status(404).json({ message: 'Advisory not found' });
      }
      
      res.status(200).json(advisory);
    } catch (error) {
      console.error('Update advisory error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
  else if (req.method === 'DELETE') {
    // Delete advisory - Admin only
    const authResult = await requireAdmin(req);
    if (!authResult || (authResult as any).error) {
      const error = (authResult as any).error || 'Unauthorized';
      const status = (authResult as any).status || 401;
      return res.status(status).json({ message: error });
    }

    try {
      const advisory = await Advisory.findByIdAndDelete(id);
      
      if (!advisory) {
        return res.status(404).json({ message: 'Advisory not found' });
      }
      
      res.status(200).json({ message: 'Advisory deleted successfully' });
    } catch (error) {
      console.error('Delete advisory error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
  else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}
