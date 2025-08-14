import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/auth';
import dbConnect from '../../../lib/db';
import AuditLog from '../../../models/AuditLog';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    const currentUser = requireAuth(req);
    if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Admin access required to view audit logs' });
    }

    if (req.method === 'GET') {
      const { page = 1, limit = 50, action, userId, resourceType } = req.query;
      
      const query: any = {};
      if (action) query.action = action;
      if (userId) query.userId = userId;
      if (resourceType) query.resourceType = resourceType;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .populate('userId', 'username email role')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit as string)),
        AuditLog.countDocuments(query)
      ]);

      res.status(200).json({
        logs,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    if (error.message === 'Authentication required' || error.message === 'Admin access required') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Audit API error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
