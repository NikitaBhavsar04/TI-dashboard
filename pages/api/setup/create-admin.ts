import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  try {
    // Check if any admin user exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        error: 'Admin user already exists', 
        email: existingAdmin.email 
      });
    }

    // Create initial admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@threatwatch.com',
      password: 'admin123', // Change this in production
      role: 'admin',
      createdBy: 'system'
    });

    await admin.save();
    
    res.status(201).json({
      message: 'Initial admin user created successfully!',
      credentials: {
        email: 'admin@threatwatch.com',
        password: 'admin123',
        note: 'Please change the password after first login!'
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
}
