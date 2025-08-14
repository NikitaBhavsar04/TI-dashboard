// API endpoint to finalize IntelDesk setup
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Update the super_admin email to inteldesk domain
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (superAdmin && superAdmin.email === 'admin@threatwatch.com') {
      await User.updateOne(
        { _id: superAdmin._id },
        { 
          $set: { 
            email: 'superadmin@inteldesk.com',
            updatedAt: new Date()
          }
        }
      );
    }

    // Get final user summary
    const users = await User.find({}, 'username email role isActive').lean();
    
    const credentials = {
      superAdmin: null,
      admins: []
    };

    users.forEach(user => {
      if (user.role === 'super_admin') {
        credentials.superAdmin = {
          email: user.email,
          username: user.username,
          password: 'Use existing password',
          access: 'Full system access including client emails'
        };
      } else if (user.role === 'admin') {
        credentials.admins.push({
          email: user.email,
          username: user.username,
          password: 'Use existing password',
          access: 'Limited admin access (no client emails)'
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: 'IntelDesk RBAC setup completed',
      summary: {
        totalUsers: users.length,
        roles: {
          super_admin: users.filter(u => u.role === 'super_admin').length,
          admin: users.filter(u => u.role === 'admin').length,
          user: users.filter(u => u.role === 'user').length
        }
      },
      credentials,
      users: users.map(u => ({
        username: u.username,
        email: u.email,
        role: u.role,
        active: u.isActive
      })),
      instructions: {
        superAdmin: 'Full access - can create any user type, see client emails, delete users/clients',
        admin: 'Limited access - can only create regular users, cannot see client emails or delete clients',
        user: 'Standard access - can view advisories and manage own profile'
      }
    });

  } catch (error) {
    console.error('Finalize error:', error);
    return res.status(500).json({ 
      error: 'Finalization failed', 
      details: error.message 
    });
  }
}
