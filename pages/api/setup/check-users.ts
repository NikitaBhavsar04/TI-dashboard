// API endpoint to check current users
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const users = await User.find({}, 'username email role isActive createdAt').lean();
    
    const userSummary = users.map(user => ({
      username: user.username,
      email: user.email,
      role: user.role,
      active: user.isActive,
      created: user.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: users.length,
      users: userSummary
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch users', 
      details: error.message 
    });
  }
}
